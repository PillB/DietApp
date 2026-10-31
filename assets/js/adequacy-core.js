/*
 * P-Diet — weekly micronutrient adequacy engine (LEDGER-8). PURE.
 * Published RDA targets (NIH ODS tables; adult values, NOT individualized):
 *   Vit A 900 µg RAE · Vit C 90 mg · Folate 400 µg DFE · Ca 1000 mg ·
 *   Fe 8 mg (male) / 18 mg (female) · Zn 11 mg (male) / 8 mg (female) ·
 *   Na ceiling 2300 mg (a limit, not a target).
 * Aggregates a planned week (recipe × portionsPerDay × days) via the composition
 * engine's computedPerServing — the honest 'computed-pending-weighin' basis
 * propagates. Empty weeks are 'inadequate-no-data' (never rubber-stamped).
 * Browser (window.AdequacyCore) + Node (module.exports). CC ≤ 12 per function.
 */
(function (root, factory) {
  const N = typeof require === 'function' ? require('./diet-nutrition-core.js') : root.DietNutritionCore;
  const api = factory(N);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdequacyCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (N) {
  'use strict';

  const RDA_SOURCE = 'NIH Office of Dietary Supplements — adult RDA tables (ods.od.nih.gov); Na ceiling per the 2300-mg DGA roundup';

  const rda = {
    vitaminAUg: 900,
    vitaminCMg: 90,
    folateUg: 400,
    calciumMg: 1000,
    ironMg: { male: 8, female: 18 },
    zincMg: { male: 11, female: 8 },
    sodiumCeilingMg: 2300,
  };

  function emptyTotals() {
    return { kcal: 0, proteinG: 0, fiberG: 0, vitaminAUg: 0, vitaminCMg: 0, folateUg: 0, calciumMg: 0, ironMg: 0, zincMg: 0, sodiumMg: 0 };
  }

  function aggregateWeek(weekPlan, composition) {
    const totals = emptyTotals();
    let missingRows = 0;
    for (const item of weekPlan || []) {
      const per = N.computedPerServing(item.recipe, composition);
      const factor = (item.portionsPerDay || 1) * (item.days || 7);
      for (const k of Object.keys(totals)) {
        if (per[k] != null) totals[k] += per[k] * factor;
      }
      totals.__missing = (totals.__missing || 0) + per.missingRows;
    }
    const r1 = (x) => Math.round(x * 10) / 10;
    const clean = {};
    for (const [k, v] of Object.entries(totals)) if (k !== '__missing') clean[k] = r1(v);
    return { totals: clean, missingRows: totals.__missing || 0, perServingBasis: 'computed-pending-weighin' };
  }

  function adequacyRow(id, actual, target, kind) {
    if (actual == null || actual === 0) return { id, status: 'inadequate-no-data', rdaTarget: target };
    if (kind === 'ceiling') {
      return { id, status: actual <= target ? 'under-ceiling' : 'over-ceiling', actual: r1(actual), rdaTarget: target };
    }
    const pct = Math.round((actual / target) * 100);
    return { id, status: pct >= 100 ? 'adequate' : 'below-rda', actual: r1(actual), rdaTarget: target, pctOfRda: pct };
  }

  function adequacyWeek(weekPlan, composition, { sex = 'male' } = {}) {
    const { totals, perServingBasis } = aggregateWeek(weekPlan, composition);
    const nutrients = [
      adequacyRow('vitaminA', totals.vitaminAUg, rda.vitaminAUg * 7, 'target'),
      adequacyRow('vitaminC', totals.vitaminCMg, rda.vitaminCMg * 7, 'target'),
      adequacyRow('folate', totals.folateUg, rda.folateUg * 7, 'target'),
      adequacyRow('calcium', totals.calciumMg, rda.calciumMg * 7, 'target'),
      adequacyRow('iron', totals.ironMg, rda.ironMg[sex] * 7, 'target'),
      adequacyRow('zinc', totals.zincMg, rda.zincMg[sex] * 7, 'target'),
      adequacyRow('fiber', totals.fiberG, 25 * 7, 'target'),
      adequacyRow('protein', totals.proteinG, null, 'info'),
      adequacyRow('sodium', totals.sodiumMg, rda.sodiumCeilingMg * 7, 'ceiling'),
    ];
    return { totals, nutrients, missingRows, perServingBasis, sex, RDA_SOURCE };
  }

  function r1(x) { return Math.round(x * 10) / 10; }

  return { RDA_SOURCE, rda, aggregateWeek, adequacyWeek };
});
