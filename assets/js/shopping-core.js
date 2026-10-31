/*
 * P3.1 — shopping aggregation (PURE). docs/DATA_CONTRACT.md §Shopping line is
 * derived output only; the DOMAIN model stays the source of truth.
 *
 * Rules encoded here (all test-proven):
 *  - scale = Σ scheduled portions / recipe.baseServings, in EXACT rationals;
 *  - same-dimension merge only after definitional conversion (kg→g, l→ml);
 *  - basis is part of line identity: raw ≠ cooked ≠ dry lines stay separate;
 *  - pantry offsets only on same ingredientId + same unit + same basis;
 *  - optional ingredients excluded by default, each exclusion audited;
 *  - count lines: default ceil() produce recommendation; g/ml lines WITHOUT a
 *    recorded package carry needsPackageDecision — no invented bundle sizes;
 *  - quarantined-recipe references refuse the WHOLE list atomically.
 * Browser (window.ShoppingCore via window.Quantity/DomainSchema) + Node.
 */
(function (root, factory) {
  const Q = typeof require === 'function' ? require('./quantity.js') : root.Quantity;
  const S = typeof require === 'function' ? require('./domain-schema.js') : root.DomainSchema;
  const api = factory(Q, S);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ShoppingCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Q, S) {
  'use strict';

  const BASIS_ORDER = ['cooked', 'dry', 'raw']; // stable sort only, not a merge key opinion

  function baseUnitOf(unit) {
    if (unit === 'kg') return 'g';
    if (unit === 'l') return 'ml';
    return unit; // count, g, ml are canonical
  }

  /** Exact rational → canonical string: finite-decimal when the denominator
   * only factors 2s and 5s, otherwise an exact fraction — never float output. */
  function rationalToString(q) {
    let d = q.den;
    let k = 0;
    while (d % 2 === 0) { d /= 2; k += 1; }
    while (d % 5 === 0) { d /= 5; k += 1; }
    if (d !== 1) return `${q.num}/${q.den}`;
    const scaled = (q.num * (10 ** k)) / q.den;
    const whole = Math.trunc(scaled / (10 ** k));
    const frac = String(scaled - whole * (10 ** k)).padStart(k, '0').replace(/0+$/, '');
    return `${whole}${frac ? '.' + frac : ''}`;
  }

  function scaledRows(recipe, totalPortions) {
    const scale = { num: totalPortions, den: recipe.baseServings };
    return recipe.ingredients.map((u) => {
      const unit = baseUnitOf(u.unit);
      const q = unit === u.unit ? Q.parseExact(u.quantity) : Q.convert(Q.parseExact(u.quantity), u.unit, unit).quantity;
      return {
        ingredientId: u.ingredientId,
        unit,
        basis: u.basis,
        key: `${u.ingredientId}|${unit}|${u.basis}`,
        quantity: Q.mul(q, scale),
        optional: u.optional,
        recipeId: recipe.id,
        version: recipe.version,
        sourcePlanEntryIds: [],
      };
    });
  }

  function mergeRows(rows) {
    const byKey = new Map();
    for (const row of rows) {
      const same = byKey.get(row.key);
      if (same) {
        same.quantity = Q.add(same.quantity, row.quantity);
        same.sourcePlanEntryIds.push(...row.sourcePlanEntryIds);
        if (same.optional && !row.optional) same.optional = false;
      } else {
        byKey.set(row.key, { ...row, sourcePlanEntryIds: [...row.sourcePlanEntryIds] });
      }
    }
    return [...byKey.values()];
  }

  /** Non-merging observable: same ingredient+unit across different bases stays 2 lines. */
  function noteBasisSplitWarning(rows, warnings) {
    const seen = new Set();
    for (const row of rows) {
      const base = `${row.ingredientId}|${row.unit}`;
      if (seen.has(base) && !warnings.some((w) => w.code === 'basis_lines_not_merged' && w.ingredientId === row.ingredientId)) {
        warnings.push({ code: 'basis_lines_not_merged', ingredientId: row.ingredientId, unit: row.unit });
      }
      seen.add(base);
    }
  }

  function ceilRational(q) {
    if (Q.isZero(q)) return { num: 0, den: 1 };
    return { num: Math.ceil(q.num / q.den), den: 1 };
  }

  function recommendForLine(line, packagesByIngredient) {
    if (line.netRequired.num <= 0) return null;
    if (line.unit === 'count') {
      return { quantity: ceilRational(line.netRequired), packages: Math.ceil(line.netRequired.num / line.netRequired.den), unit: 'count', rule: 'ceil-count-default' };
    }
    const pkg = packagesByIngredient[line.ingredientId];
    if (pkg) {
      const pkgBaseUnit = baseUnitOf(pkg.unit);
      if (pkgBaseUnit === line.unit) {
        const pkgQty = Q.parseExact(pkg.quantity);
        const n = { num: line.netRequired.num * pkgQty.den, den: line.netRequired.den * pkgQty.num };
        return { quantity: ceilRational(n), packages: Math.ceil((line.netRequired.num / line.netRequired.den) / (pkgQty.num / pkgQty.den)), unit: line.unit, packageQty: pkgQty, rule: 'recorded-package' };
      }
    }
    return null;
  }

  function validateEntries(planEntries, errors) {
    for (const e of planEntries || []) {
      const v = S.validatePlanEntry(e);
      if (!v.ok) errors.push({ code: 'invalid_plan_entry', planEntryId: e.id, details: v.errors });
    }
  }

  function totalsForRange(inRange, quarantineIds, errors) {
    const totals = new Map(); // `recipeId@version` → { portions, entryIds }
    for (const e of inRange) {
      const key = `${e.recipeId}@${e.version}`;
      if (!totals.has(key)) totals.set(key, { portions: 0, entryIds: [] });
      const t = totals.get(key);
      t.portions += e.portions;
      t.entryIds.push(e.id);
      if (quarantineIds.has(e.recipeId)) errors.push({ code: 'shopping_math_locked_recipe', recipeId: e.recipeId, planEntryId: e.id });
    }
    return totals;
  }

  function scaleTotals(totals, byId, errors) {
    const rows = [];
    for (const [key, t] of totals) {
      const [recipeId, version] = key.split('@');
      const recipe = byId.get(recipeId) && byId.get(recipeId).get(Number(version));
      if (!recipe) {
        errors.push({ code: 'recipe_not_found', recipeId, version: Number(version), planEntryIds: t.entryIds });
        continue;
      }
      const recipeRows = scaledRows(recipe, t.portions).map((row) => ({ ...row, sourcePlanEntryIds: [...t.entryIds] }));
      rows.push(...recipeRows);
    }
    return rows;
  }

  function applyOptional(rows, optionalChoices, warnings) {
    const chosen = [];
    for (const row of rows) {
      if (row.optional && !(optionalChoices && optionalChoices[row.ingredientId])) {
        warnings.push({ code: 'optional_excluded', ingredientId: row.ingredientId, recipeId: row.recipeId });
      } else {
        chosen.push({ ...row, optional: false });
      }
    }
    return chosen;
  }

  function buildShoppingList({ recipes, planEntries, from, to, pantry, optionalChoices, packages, quarantine }) {
    const warnings = [];
    const errors = [];
    // LEDGER-D48: inverted range is a caller error — refuse, never silently empty
    if (typeof from === 'string' && typeof to === 'string' && from > to) {
      errors.push({ code: 'inverted_range' });
      return { lines: [], warnings, errors, refused: true };
    }
    validateEntries(planEntries, errors);
    if (errors.length) return { lines: [], warnings, errors, refused: true };

    const inRange = (planEntries || []).filter((e) => e.localDate >= from && e.localDate <= to);
    const quarantineIds = new Set((quarantine || []).filter((q) => q.shoppingMathLocked).map((q) => q.id));
    const totals = totalsForRange(inRange, quarantineIds, errors);
    if (errors.length) return { lines: [], warnings, errors, refused: true };

    const byId = new Map();
    for (const r of recipes || []) {
      if (!byId.has(r.id)) byId.set(r.id, new Map());
      byId.get(r.id).set(r.version, r);
    }
    const rows = scaleTotals(totals, byId, errors);
    if (errors.length) return { lines: [], warnings, errors, refused: true };

    const applyOptionalResult = applyOptional(rows, optionalChoices, warnings);
    noteBasisSplitWarning(applyOptionalResult, warnings);
    const merged = mergeRows(applyOptionalResult);
    const out = assembleLines(merged, pantry, warnings, packages || {});
    out.lines.sort((a, b) => `${a.ingredientId}|${BASIS_ORDER.indexOf(a.basis)}`.localeCompare(`${b.ingredientId}|${BASIS_ORDER.indexOf(b.basis)}`));
    return out;
  }

  function assembleLines(merged, pantry, warnings, packagesByIngredient) {
    const pantryByBasisKey = new Map();
    for (const p of pantry || []) pantryByBasisKey.set(`${p.ingredientId}|${baseUnitOf(p.unit)}|${p.basis}`, Q.parseExact(p.quantity));
    const lines = [];
    for (const m of merged) {
      const lineKey = `${m.ingredientId}|${m.unit}|${m.basis}`;
      const lineWarnings = [];
      const have = pantryByBasisKey.get(lineKey);
      let pantryUsed = null;
      let net = m.quantity;
      if (have != null) {
        pantryUsed = Q.gt(have, m.quantity) ? m.quantity : have; // consumed = min(have, need)
        net = Q.gt(m.quantity, have) ? Q.sub(m.quantity, have) : { num: 0, den: 1 };
      } else if (hasMismatchedPantry(pantryByBasisKey, m, lineKey)) {
        warnings.push({ code: 'pantry_basis_mismatch', ingredientId: m.ingredientId, neededBasis: m.basis });
        lineWarnings.push('pantry_basis_mismatch');
      }
      const purchaseRecommendation = recommendForLine({ ingredientId: m.ingredientId, unit: m.unit, netRequired: net }, packagesByIngredient);
      if (net.num > 0 && purchaseRecommendation === null) {
        warnings.push({ code: 'needs_package_decision', ingredientId: m.ingredientId, unit: m.unit });
        lineWarnings.push('needs_package_decision');
      }
      lines.push({
        ingredientId: m.ingredientId,
        unit: m.unit,
        basis: m.basis,
        needed: m.quantity,
        neededString: rationalToString(m.quantity),
        netRequired: net,
        netRequiredString: rationalToString(net),
        pantry: pantryUsed,
        purchaseRecommendation,
        sourcePlanEntryIds: [...m.sourcePlanEntryIds],
        warnings: lineWarnings,
      });
    }
    return { lines, warnings, errors: [], refused: false };
  }

  function hasMismatchedPantry(pantryByBasisKey, row, lineKey) {
    return [...pantryByBasisKey.keys()].some((k) => k.startsWith(`${row.ingredientId}|${row.unit}|`) && k !== lineKey);
  }

  return { buildShoppingList, rationalToString, ceilRational, baseUnitOf, mergeRows, scaledRows };
});
