/*
 * P-Diet — composition engine: perServing computation from the TPCA per100g rows.
 * PURE; honest labeling: values are `computed-pending-weighin`, NOT assessed.
 * Unknown ingredient/quantity unit yields nulls with explicit flags — never fabricated.
 * Browser (window.DietNutritionCore) + Node (module.exports). CC ≤ 12 per function.
 */
(function (root, factory) {
  const Q = typeof require === 'function' ? require('./quantity.js') : root.Quantity;
  const api = factory(Q);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DietNutritionCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Q) {
  'use strict';

  /** Unit-mass approximations for count-based ingredients (Peru market averages;
   * NEED OWNER LAB-SCALE for published strength). Only the brittle ones. */
  const UNIT_GRAMS_APPROX = {
    egg: { unit: 'count', grams: 55, note: 'large hen egg ≈55 g' },
    clara_huevo: { unit: 'count', grams: 33, note: 'one white ≈33 g' },
  };

  function computeServingNutrition(ingredientId, quantity, unit, composition) {
    const row = composition[ingredientId] || null;
    if (!row || !row.per100g) {
      return { ingredientId, kcal: null, proteinG: null, fiberG: null, flags: ['no_composition_row'] };
    }
    const grams = gramsFor(recipeQuantity(quantity), unit, ingredientId);
    if (grams == null) return { ingredientId, kcal: null, proteinG: null, fiberG: null, flags: [gramsFlagOf(unit)] };
    return scaledPer100g(ingredientId, grams, row);
  }

  function recipeQuantity(quantity) {
    return typeof quantity === 'string' ? String(quantity).trim() : String(quantity);
  }

  const FACT = { g: 1, kg: 1000, ml: 1, l: 1000 };

  function gramsFor(rawQ, unit, ingredientId) {
    const isCount = unit === 'count' || unit === 'each';
    if (!isCount) return nullMass(rawQ, unit);
    const approx = UNIT_GRAMS_APPROX[ingredientId];
    if (!approx) return null;
    const cnt = parseFloat(rawQ);
    if (!Number.isFinite(cnt)) return null;
    return approx.grams * cnt;
  }

  function nullMass(rawQ, unit) {
    let q;
    try { q = Q.parseExact(rawQ); } catch (e) { return null; }
    const factor = FACT[unit];
    if (factor == null) return null;
    return (q.num / q.den) * factor;
  }

  function gramsFlagOf(unit) {
    const isCount = unit === 'count' || unit === 'each';
    if (isCount) return 'unit_mass_unknown';
    if (FACT[unit] == null) return 'bad_unit';
    return 'bad_quantity';
  }

  function scaledPer100g(ingredientId, grams, row) {
    const per = row.per100g;
    const rawKcal = per.kcal == null ? null : (per.kcal * grams) / 100;
    if (rawKcal != null && !Number.isFinite(rawKcal)) {
      throw new Error(`bad kcal for ${ingredientId}: ${per.kcal}`);
    }
    const round = (x, n) => (x == null ? null : Math.round(x * 10 ** n) / 10 ** n);
    const scale = (v) => (v == null ? null : (v * grams) / 100);
    return {
      ingredientId,
      gramsServed: round(grams, 1),
      kcal: round(rawKcal, 1),
      proteinG: round(scale(per.proteinG), 1),
      fiberG: round(scale(per.fiberG), 1),
      // micronutrients (TPCA columns; NS stays null)
      vitaminAUg: round(scale(per.vitaminAUg), 1),
      vitaminCMg: round(scale(per.vitaminCMg), 1),
      folateUg: round(scale(per.folateUg), 1),
      calciumMg: round(scale(per.calciumMg), 1),
      ironMg: round(scale(per.ironMg), 2),
      zincMg: round(scale(per.zincMg), 2),
      sodiumMg: round(scale(per.sodiumMg), 1),
      flags: [],
    };
  }

  /** Whole-recipe perServing: sum all ingredient uses, divide by baseServings. */
  function computedPerServing(recipe, composition) {
    const totals = { kcal: 0, proteinG: 0, fiberG: 0, vitaminAUg: 0, vitaminCMg: 0, folateUg: 0, calciumMg: 0, ironMg: 0, zincMg: 0, sodiumMg: 0, misses: 0 };
    for (const use of recipe.ingredients) {
      const s = computeServingNutrition(use.ingredientId, use.quantity, use.unit, composition);
      if (s.kcal == null) { totals.misses += 1; continue; }
      for (const k of Object.keys(totals)) if (k !== 'misses' && s[k] != null) totals[k] += s[k];
    }
    const bs = recipe.meta ? recipe.meta.baseServings : recipe.baseServings || 1;
    const r1 = (x) => Math.round(x * 10) / 10;
    return {
      status: 'computed-pending-weighin', // honest label: NOT assessed, NOT lab
      kcal: r1(totals.kcal / bs),
      proteinG: r1(totals.proteinG / bs),
      fiberG: r1(totals.fiberG / bs),
      vitaminAUg: r1(totals.vitaminAUg / bs),
      vitaminCMg: r1(totals.vitaminCMg / bs),
      folateUg: r1(totals.folateUg / bs),
      calciumMg: r1(totals.calciumMg / bs),
      ironMg: r1(totals.ironMg / bs),
      zincMg: r1(totals.zincMg / bs),
      sodiumMg: r1(totals.sodiumMg / bs),
      missingRows: totals.misses,
    };
  }

  return { computeServingNutrition, computedPerServing, UNIT_GRAMS_APPROX };
});
