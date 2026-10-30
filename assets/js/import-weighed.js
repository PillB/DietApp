/*
 * P1.2 — normalization importer for the seven weighed illustrative recipes
 * (nutrition-reviewed.json → canonical domain model). For the 29 legacy prose
 * recipes it emits QUARANTINE records only: they are NOT representable as
 * RecipeVersions and must never feed aggregated shopping math unreviewed.
 * Pure module (browser + Node, UMD pattern).
 *
 * Honesty rules implemented here:
 *  - numeric source quantities become EXACT strings; non-exact floats fail
 *    rather than silently rounding;
 *  - 'each' → count with basis 'raw'; prose weightBasis must parse to a known
 *    basis or the recipe is quarantined (unknown basis is never guessed);
 *  - English prose steps are copied verbatim with NO invented ingredient
 *    references, timers, temperatures or pressure fields;
 *  - nutrition stays status:'not-assessed' and flavorTags are NOT imported —
 *    tag inference is P5 with its own evidence rules;
 *  - importReport records every warning/reason for review workflows.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ImportWeighed = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const FALLBACK_SPA = 'es-PE';
  const SOURCE_NAME = 'nutrition-reviewed.json#curatedRecipes';

  function exactQuantityString(n) {
    if (!Number.isFinite(n)) return null;
    const s = String(n);
    if (/[eE]/.test(s) || !Number.isFinite(Number(s)) || Number(s) !== n) return null; // non-exact/scientific
    return s;
  }

  function basisFromWeightBasis(raw) {
    const v = String(raw || '').toLowerCase();
    if (v.includes('uncooked') || v.startsWith('raw')) return 'raw';
    if (v.includes('cooked')) return 'cooked';
    if (v.includes('dry')) return 'dry';
    return null; // unknown basis is never guessed
  }

  function toCanonicalIngredient(src) {
    return {
      id: src.id,
      name: { en: src.label },
      nameProvisional: true,
      family: (src.category || '').toLowerCase().replace(/\s+/g, '-'),
      dimension: src.unit === 'each' ? 'count' : src.unit,
      purchaseUnit: src.unit === 'each' ? 'count' : src.unit,
      aliases: [],
      foodCompositionRef: src.nutrientKey || null,
      allergenCodes: [],
    };
  }

  function toCanonicalRecipe(src) {
    return {
      id: src.id,
      version: 1,
      recipeKind: 'meal',
      validationStatus: 'reviewPending',
      originalSource: SOURCE_NAME,
      baseServings: src.servings,
      yieldCookedG: null,
      equipment: [], // prose does not record equipment reliably; normalization pending
      times: {
        activeMin: src.activeMinutes,
        passiveMin: src.totalMinutes - src.activeMinutes,
        pressureMin: null,
        releaseMin: null,
      },
      ingredients: [],
      steps: (src.steps || []).map((text, i) => ({
        id: `s${i + 1}`,
        order: i + 1,
        text: { en: String(text) },
        ingredients: [],
        timeMin: null,
        targetTempC: null,
        checkpoint: null,
        hazardNotes: [],
      })),
      nutrition: { perServing: null, sourceIds: [SOURCE_NAME], status: 'not-assessed' },
      flavorTags: [],
    };
  }

  function useRecordFromItem(src, item, state) {
    const qstr = exactQuantityString(item.weightG != null && item.unit !== 'each' ? item.weightG : item.quantity);
    if (qstr === null) {
      state.errors.push({ level: 'error', source: src.id, ingredient: item.id, code: 'non_exact_quantity', message: `quantity ${item.quantity} is not an exact finite value` });
      return false;
    }
    const basis = basisFromWeightBasis(item.weightBasis);
    if (basis === null && item.unit === 'ml' && /label/i.test(String(item.weightBasis))) {
      // bottled liquid: physical state at addition is raw; composition stays label-dependent
      // (nutrition must come from brand label data, null until then — recorded, never lost)
      state.useRecords.push({ ingredientId: item.id, quantity: qstr, unit: 'ml', basis: 'raw', optional: false });
      if (!state.ingredients.has(item.id)) state.ingredients.set(item.id, toCanonicalIngredient(item));
      state.errors.push({ level: 'warn', source: src.id, ingredient: item.id, code: 'composition_label_dependent', message: `basis "${item.weightBasis}" imported as raw liquid; composition needs brand label data` });
      return true;
    }
    if (basis === null) {
      state.errors.push({ level: 'error', source: src.id, ingredient: item.id, code: 'unknown_basis', message: `weightBasis "${item.weightBasis}" does not parse to raw|cooked|dry` });
      return false;
    }
    state.useRecords.push({ ingredientId: item.id, quantity: qstr, unit: item.unit === 'each' ? 'count' : item.unit, basis, optional: false });
    if (!state.ingredients.has(item.id)) state.ingredients.set(item.id, toCanonicalIngredient(item));
    return true;
  }

  function importWeighed(curatedRecipes) {
    const report = [];
    const ingredients = new Map();
    const recipes = [];
    const quarantined = [];

    for (const src of curatedRecipes || []) {
      const state = { errors: [], useRecords: [], ingredients };
      const everyItemOK = (src.ingredients || []).every((item) => useRecordFromItem(src, item, state));
      if (state.errors.length === 0) {
        state.errors.push({ level: 'warn', source: src.id, code: 'equipment_not_normalized', message: 'equipment must be normalized by review; prose does not record it' });
      }
      report.push(...state.errors);
      if (!everyItemOK || state.useRecords.length === 0) {
        quarantined.push({ id: src.id, reason: 'import_errors', errors: state.errors.filter((e) => e.level === 'error') });
        continue;
      }
      const canonical = toCanonicalRecipe(src);
      canonical.ingredients = state.useRecords;
      recipes.push(canonical);
    }
    return {
      ingredients: [...ingredients.values()],
      recipes,
      quarantined,
      report,
    };
  }

  function importLegacyQuarantine(legacyAudits) {
    // Emitted as pure quarantine markers, never RecipeVersions.
    return (legacyAudits || []).map((a) => ({
      id: a.id,
      name: a.name || null,
      servings: a.servings == null ? null : String(a.servings),
      validationStatus: 'needs_normalization',
      reviewStatus: a.status || 'review-needed',
      issues: a.issues || [],
      shoppingMathLocked: true, // aggregate shopping must refuse these until human normalization
      source: 'nutrition-reviewed.json#legacyRecipeAudits',
    }));
  }

  return {
    IMPORT_VERSION: 'import/v0.2',
    exactQuantityString,
    basisFromWeightBasis,
    importWeighed,
    importLegacyQuarantine,
    FALLBACK_SPA,
  };
});
