/*
 * P-Diet/P5.4 — deficit-week assembly (PURE).
 * Plan 7 days × slots from a candidate pool with EXPLAINABLE recipe ranking
 * (FlavorRanking labels) and DietCore gates — all diet constraints explicit.
 * Honest limitation carried in warnings: per-recipe kcal/macros are NOT wired
 * yet (LEDGER-3) — picks are structurally SCHEMA-valid but 'nutrition-pending'.
 * Portion source: caller defaultPortions (household choice), NOT auto-scaled.
 * Browser (window.DeficitPlanner) + Node (module.exports). CC ≤ 12 per function.
 */
(function (root, factory) {
  const D = typeof require === 'function' ? require('./diet-core.js') : root.DietCore;
  const RANK = typeof require === 'function' ? require('./flavor-ranking.js') : root.FlavorRanking;
  const C = typeof require === 'function' ? require('./calendar-core.js') : root.CalendarCore;
  const api = factory(D, RANK, C);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DeficitPlanner = api;
})(typeof window !== 'undefined' ? window : globalThis, function (D, RANK, C) {
  'use strict';

  function planDeficitWeek({ recipes, slotHints, targetKcal, policy, startFromIso, profile, lexicon, storeCatalog, householdEquipment, ingredientCategories, defaultPortions }) {
    const plan = D.buildPlan({ targetKcal }, policy || {});
    const days = sevenDays(C, startFromIso);
    const entries = [];
    const picks = [];
    const warnings = [];
    for (const [slot, candidateIds] of Object.entries(slotHints || {})) {
      const candidates = (recipes || []).filter((r) => (candidateIds || []).includes(r.id));
      if (candidates.length === 0) {
        warnings.push({ code: 'no_candidate', slot, text: `Slot ${slot}: no candidate recipe — leave EMPTY rather than invent a meal.` });
        continue;
      }
      const ranked = RANK.rankRecipes({ recipes: candidates, profile, lexicon, storeCatalog, householdEquipment, ingredientCategories });
      if (ranked.length === 0) { warnings.push({ code: 'no_candidate', slot, text: `Slot ${slot}: no candidate recipe.` }); continue; }
      const top = ranked[0];
      const portions = ((defaultPortions || {})[slot]) || 1;
      days.forEach((iso, i) => {
        entries.push({ id: dayId(i, slot), localDate: iso, slot, recipeId: top.recipeId, version: 1, portions, repeatRuleId: null, pantryOverride: null });
      });
      picks.push({ slot, recipeId: top.recipeId, score: top.score, features: top.features, explanation: top.explanation });
    }
    warnings.push({ code: 'nutrition-pending', text: 'Weekly assembly validates STRUCTURE (schema, slots, ranking) only; per-serving kcal/macros are NOT wired yet (LEDGER-3) — the served panel gates on nutrition before trusting calories.' });
    return { targetKcal: plan.targetKcal, category: plan.category, entries, picks, warnings, caveats: plan.caveats };
  }

  function sevenDays(C, startFromIso) {
    const base = C.weekOf(startFromIso)[0]; // anchor Monday of the START week (same Monday → same week)
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = C.realCalendarDate(base);
      d.setDate(d.getDate() + i);
      const p = (n) => String(n).padStart(2, '0');
      out.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    }
    return out;
  }

  function dayId(i, slot) {
    return `w0d${i + 1}_${String(slot || 'slot').toLowerCase().replace(/[^a-z0-9_-]/g, '')}`.slice(0, 40);
  }

  return { planDeficitWeek };
});
