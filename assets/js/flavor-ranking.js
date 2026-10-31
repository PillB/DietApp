/*
 * P5.4 — explainable recipe ranking (PURE).
 * Every feature is LABELED (human reason + basis + weight). Defaults:
 *   affinity 0.35 (behavioral-count) — overlap of recipe ingredient-CATEGORIES
 *     with the owner's observed dish categories (volume-weighted share);
 *   flavorFit 0.20 (curated-lexicon-inferred) — taste/texture nodes of a
 *     category pulled from the shipped lexicon (NOT behavioral evidence);
 *   storeCoverage 0.20 (fixture-presence: 'not checked' availability tags rear
 *     out in reasons, never fake stock claims);
 *   equipment 0.15 (household list), readiness = 0/1 per missing pieces;
 *   novelty 0.10 (inverse-overlap with the observed dish pool).
 * Refusals: unknown feature id (typo-protection), weights not equal 1,
 * wrong lexicon schema. Deterministic output.
 * Global user rule: CC ceiling 12 per function.
 * Browser (window.FlavorRanking) + Node (module.exports).
 */
(function (root, factory) {
  const api = factory(typeof require === 'function' ? globalThis : root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FlavorRanking = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const DEFAULT_FEATURES = {
    affinity: 0.35,
    flavorFit: 0.20,
    storeCoverage: 0.20,
    equipment: 0.15,
    novelty: 0.10,
  };

  function buildGraphRef() {
    return typeof require === 'function' ? require('./flavor-graph.js') : root.FlavorGraph;
  }

  function validateRankingInputs({ weights, ids, lexicon, features }) {
    const known = Object.keys(DEFAULT_FEATURES);
    for (const id of ids) if (!known.includes(id)) throw Object.assign(new Error(`unknown feature ${id}`), { code: 'unknown_feature' });
    if (Math.abs(ids.reduce((s, id) => s + weights[id], 0) - 1) > 1e-6) throw Object.assign(new Error('feature weights must sum to 1'), { code: 'bad_weights' });
    if (features && !ids.includes(features)) throw Object.assign(new Error('focus feature must be one of the weights'), { code: 'unknown_feature' });
    const lex = lexicon || { schema: 'flavor-lexicon/v1', sourceNote: 'empty (fetch-race)', entries: [] };
    if (lex.schema !== 'flavor-lexicon/v1') throw Object.assign(new Error('lexicon must be flavor-lexicon/v1'), { code: 'bad_lexicon_schema' });
  }

  /** Graph build is strict; missing observed-category context (planner boot with no atlas
   * loaded yet) degrades to 0 fit labeling instead of refusing the whole rank. */
  function safeGraph(profile, lex) {
    try {
      return buildGraphRef().buildGraph({ dishPool: profile.dishPool, items: profile.items, excluded: profile.excluded, monthsSeries: profile.monthsSeries || {}, confidenceProfile: profile.confidenceProfile || {}, caveats: profile.caveats || [] }, lex);
    } catch (e) {
      if (e.code !== 'unknown_category') throw e;
      return null;
    }
  }

  function rankRecipes({ recipes, profile, lexicon, storeCatalog, householdEquipment, featureWeights, features, ingredientCategories }) {
    const lex = lexicon || { schema: 'flavor-lexicon/v1', sourceNote: 'empty (fetch-race)', entries: [] };
    if (lex.schema !== 'flavor-lexicon/v1') throw Object.assign(new Error('lexicon must be flavor-lexicon/v1'), { code: 'bad_lexicon_schema' });
    const weights = featureWeights || DEFAULT_FEATURES;
    validateRankingInputs({ weights, ids: Object.keys(weights), lexicon: lex, features });
    const graph = safeGraph(profile, lex);
    const countsByCategory = new Map(profile.items.flatMap((x) => x.topCategories).map((c) => [c.id, c.count]));
    const tasteByCuisine = graph ? tasteIndex(graph) : new Map();
    const catalogIds = new Set((storeCatalog || []).filter((r) => r.ingredientId).map((r) => r.ingredientId));
    const observedNames = new Set(profile.items.map((x) => x.name));
    const observedCategories = new Set(countsByCategory.keys());
    const out = [];
    for (const recipe of recipes) {
      const ingredientIds = recipe.ingredients.map((u) => u.ingredientId);
      const cats = recipeCategories(ingredientIds, ingredientCategories, observedCategories);
      const affinity = affinityValue(cats, countsByCategory, profile.dishPool);
      const flavorFeature = cuisineFlavorFit(cats, tasteByCuisine);
      const coverage = storeCoverageValue(ingredientIds, catalogIds);
      const equip = equipmentValue(recipe.equipment, householdEquipment || []);
      const novelty = noveltyValue(ingredientIds, observedNames);
      const feats = [
        feature('affinity', affinity.value, weights.affinity, affinity.reason, 'behavioral-count'),
        feature('flavorFit', flavorFeature.value, weights.flavorFit, flavorFeature.reason, 'curated-lexicon-inferred'),
        feature('storeCoverage', coverage.value, weights.storeCoverage, coverage.reason, 'fixture-presence-not-checked'),
        feature('equipment', equip.value, weights.equipment, equip.reason, 'household-inventory'),
        feature('novelty', novelty.value, weights.novelty, novelty.reason, 'inverse-overlap'),
      ];
      out.push({ recipeId: recipe.id, score: Math.round(feats.reduce((s, f) => s + f.weight * f.value, 0) * 1000) / 1000, features: feats, explanation: explain(recipe.id, feats, equip) });
    }
    out.sort((a, b) => b.score - a.score || (a.recipeId || '').localeCompare(b.recipeId || ''));
    return out;
  }

  function feature(id, value, weight, reason, basis) {
    return { id, value: Math.round(value * 1000) / 1000, weight, reason, basis };
  }

  function recipeCategories(ingredientIds, ingredientCategories, observedCategories) {
    const out = new Map();
    const bridge = ingredientCategories || {};
    for (const id of ingredientIds) {
      for (const cat of bridge[id] || []) {
        if (observedCategories.has(cat)) out.set(cat, countsUp(out, cat) + 1);
      }
    }
    return out;
  }

  function countsUp(mapOf, key) {
    return mapOf.get(key) || 0;
  }

  function affinityValue(cats, countsByCategory, dishPool) {
    let hitCount = 0;
    const matched = [];
    for (const [cat] of cats) {
      const count = countsByCategory.get(cat) || 0;
      hitCount += count;
      matched.push(`${cat} ×${count}`);
    }
    if (dishPool <= 0) return { value: 0, reason: 'no observed dish pool to align with' };
    return { value: Math.min(1, hitCount / dishPool), reason: matched.length ? `overlaps observed dish categories: ${matched.join(', ')} (bridge via curated lexicon — inferred mapping)` : 'no overlap with the observed dish pool categories' };
  }

  function cuisineFlavorFit(cats, tasteByCuisine) {
    const notes = [];
    let sum = 0;
    let n = 0;
    for (const [cat] of cats) for (const t of tasteByCuisine.get(cat) || []) { sum += t.weight; n += 1; notes.push(t.note); }
    if (n === 0) return { value: 0, reason: 'no curated flavor links apply (taste mapping is inferred, NOT behavioral)' };
    return { value: sum / n, reason: `curated taste/texture alignment: ${notes.slice(0, 2).join('; ')} (inferred, NOT behavioral evidence)` };
  }

  function storeCoverageValue(ingredientIds, catalogIds) {
    const hits = ingredientIds.filter((id) => catalogIds.has(id));
    const missing = ingredientIds.filter((id) => !catalogIds.has(id));
    const value = ingredientIds.length ? hits.length / ingredientIds.length : 0;
    return { value, reason: missing.length ? `${hits.length}/${ingredientIds.length} ingredients have catalog structure rows (availability 'not checked' — nothing live) ; missing: ${missing.slice(0, 3).join(', ')}` : `all ${ingredientIds.length} ingredients have structure rows (availability 'not checked')` };
  }

  function equipmentValue(recipeEquipment, household) {
    const missing = (recipeEquipment || []).filter((e) => !household.some((h) => h.toLowerCase().includes(String(e).toLowerCase()) || String(e).toLowerCase().includes(String(h).toLowerCase())));
    return {
      value: recipeEquipment.length ? (recipeEquipment.length - missing.length) / recipeEquipment.length : 1,
      reason: missing.length ? `equipment missing for pieces: ${missing.join(', ')} (check before cooking)` : `household has all listed equipment (${recipeEquipment.length || 0})`,
    };
  }

  function noveltyValue(ingredientIds, observedNames) {
    const expired = ingredientIds.filter((id) => !observedNames.has(id));
    return {
      value: ingredientIds.length ? expired.length / ingredientIds.length : 1,
      reason: expired.length ? `novelty via ingredients absent from past orders: ${expired.slice(0, 3).join(', ')}` : 'all ingredients appeared in the observed dish pool (comfort zone)',
    };
  }

  function tasteIndex(graph) {
    const m = new Map();
    for (const e of graph.edges) {
      if (e.relation === 'pairs-with-flavor') {
        const list = m.get(e.from) || [];
        list.push({ id: e.to, weight: e.weight, note: e.basis.note });
        m.set(e.from, list);
      }
    }
    return m;
  }

  function explain(recipeId, feats, equip) {
    const parts = [];
    for (const f of feats) parts.push(`${f.id} ${f.value} (w${f.weight}) — ${f.reason}`);
    if (equip.value < 1) parts.push('equipment missing, plan purchases/borrowing BEFORE cooking');
    return `Por qué este puesto para ${recipeId}: ${parts.join(' | ')}`;
  }

  return { rankRecipes, DEFAULT_FEATURES };
});
