/*
 * LEDGER-2 tooling — P4.4 kitchen weigh-in worksheet (PURE logic).
 * The owner logs real per-ingredient weights + the measured cooked yield;
 * promotion to 'weighed-pending-review' requires: every NON-OFFICIAL ingredient
 * weighed + the yield measured. Partial/negative inputs stay honestly flagged.
 * The final 'assessed' status still needs the dual review (P4.3) — this
 * worksheet only proves the KITCHEN half.
 * Browser (window.WeighInCore) + Node (module.exports). CC ≤ 12 per function.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WeighInCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /** Planned grams per ingredient (household-measure approximations for counts). */
  const UNIT_GRAMS = { count: 55, clara: 33 }; // egg-like fallbacks; g/ml use the factor path

  function plannedGrams(use) {
    const q = parseFloat(use.quantity);
    if (!Number.isFinite(q)) return null;
    if (use.unit === 'g') return q;
    if (use.unit === 'kg') return q * 1000;
    if (use.unit === 'ml') return q;
    if (use.unit === 'l') return q * 1000;
    if (use.unit === 'count') return q * (UNIT_GRAMS[use.ingredientId] || 55);
    return null;
  }

  function evaluateWeighIn(recipe, submission) {
    const weighIns = submission.weighIns || {};
    const yieldG = submission.yieldG;
    const required = (recipe.ingredients || []).filter((u) => !u.optional);
    const missing = [];
    const lines = [];
    let plannedTotal = 0;
    let actualTotal = 0;
    for (const use of required) {
      const actual = weighIns[use.ingredientId];
      const planned = plannedGrams(use);
      if (planned == null) { missing.push(use.ingredientId + ' (unconvertible unit)'); continue; }
      plannedTotal += planned;
      if (typeof actual !== 'number' || !Number.isFinite(actual)) { missing.push(use.ingredientId); continue; }
      if (actual < 0) return { status: 'invalid-weighin', missing: [], lines: [], variancePct: null, flags: ['negative-grams'] };
      actualTotal += actual;
      lines.push({ ingredientId: use.ingredientId, plannedG: planned, actualG: actual, deltaG: Math.round((actual - planned) * 10) / 10 });
    }
    if (typeof yieldG !== 'number' || !Number.isFinite(yieldG) || yieldG <= 0) missing.push('yieldG');
    if (missing.length) return { status: 'incomplete-weighin', missing, lines, variancePct: null, flags: [] };
    const variancePct = Math.round((Math.abs(actualTotal - plannedTotal) / plannedTotal) * 1000) / 10;
    const flags = [];
    if (variancePct > 20) flags.push('portions-may-differ');
    return {
      status: 'weighed-pending-review',
      missing: [],
      lines,
      yieldG,
      plannedTotalG: Math.round(plannedTotal * 10) / 10,
      actualTotalG: Math.round(actualTotal * 10) / 10,
      variancePct,
      flags,
      note: 'Kitchen half proven; the final assessed status needs the P4.3 dual review.',
    };
  }

  return { evaluateWeighIn, plannedGrams };
});
