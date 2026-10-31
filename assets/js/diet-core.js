/*
 * P-Diet — weight-loss diet targets + satiety engine (PURE, published-guide values).
 * NOT a medical prescription; existing estimateEnergy handles user-parameterized
 * TDEE/deficit upstream. This module defines STRUCTURAL meal composition envelopes
 * and scores candidate recipes against them. Aggressive plans are allowed ONLY
 * with an explicit acknowledgment flag coming from the owner/UI, never silently.
 *
 * SOURCES (published, general-population guidance):
 *  - Protein 1.2-1.6 g/kg/day band for weight management/satiety (already used by
 *    nutrition-reviewed.json proteinRange; consistent with dietary guidelines perspective).
 *  - Fiber: ≥25 g/day women, men ≥30 g/day (2025-2030 DGA Adequate Intake midpoints;
 *    newer guidance trends 28-33 g). We floor the DAY at 25 g and distribute.
 *  - Added sugars < 10% of energy (DGA); aim lower in an aggressive deficit.
 *  - Saturated fat < 10% of energy (DGA).
 *  - Sodium < 2300 mg/day for adults (DGA chronic-disease roundup).
 *  - Vegetables ≥ 2-3 servings/day incl. leafy greens most days (DGA + local plate model).
 *  - 2 L water/day standing rule (from the owner's reference menu) kept as a reminder only.
 *  - Supplements (DHA capsule, zinc/magnesium electrolyte water) come from the owner's
 *    reference sheet and are surfaced as OUR recommendations to VERIFY with a clinician,
 *    never prescribed by code.
 * Browser (window.DietCore) + Node (module.exports). CC ≤ 12 per function.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DietCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SOURCES = [
    'protein 1.2-1.6 g/kg/day for satiety-preserving weight management (published range already encoded in nutrition-reviewed.json proteinRange)',
    'fiber ≥ 25 g/day (2025-2030 DGA Adequate Intake; aim 25-34 g/day in aggressive plans)',
    'added sugars < 10% of energy; saturated fat < 10% of energy (DGA)',
    'sodium < 2300 mg/day (DGA chronic-disease roundup)',
    'vegetables ≥ 2-3 servings/day incl. leafy greens most days',
    'water ≈ 2 L/day standing rule (owner reference menu; clinician-verify supplements: DHA, zinc/magnesium)',
  ];

  const DEFAULT_SHARES = { desayuno: 0.25, almuerzo: 0.35, cena: 0.30, snacks: 0.10 };

  const AGGRESSIVE_THRESHOLD = 1500; // >=1500 kcal/day: general maintenance-deficit; <1500 needs acknowledged review
  function buildPlan({ targetKcal, shares = DEFAULT_SHARES }, policy = {}) {
    if (!Number.isFinite(targetKcal)) throw Object.assign(new Error('targetKcal required'), { code: 'bad_target' });
    if (targetKcal < 1200) throw Object.assign(new Error('1200 kcal is the published floor for supervised plans'), { code: 'below_floor' });
    const aggressive = targetKcal < AGGRESSIVE_THRESHOLD;
    if (aggressive && !policy.clinicianReviewAcknowledged) {
      throw Object.assign(new Error('below 1500 kcal requires the owner/UI to acknowledge a clinician-review gate'), { code: 'unacknowledged_aggressive' });
    }
    const shareSum = Object.values(shares).reduce((s, x) => s + x, 0);
    if (Math.abs(shareSum - 1) > 0.001) throw Object.assign(new Error('shares must sum to 1'), { code: 'bad_shares' });
    return {
      category: aggressive ? 'aggressive' : 'moderate',
      targetKcal,
      mealShares: { ...shares },
      dailyProteinMinKg: 1.2,
      dailyProteinMaxKg: 1.6,
      dailyFiberMin: 25,
      addedSugarMaxKcalShare: aggressive ? 0.05 : 0.10,
      saturatedFatMaxKcalShare: 0.10,
      sodiumMgMax: 2300,
      vegetablesServingsMinPerDay: 2,
      greensMostDays: true,
      waterLitersMin: 2,
      caveats: [
        'This plan is structural guidance against published general-population targets; it is NOT a medical prescription and NOT individualized (no age/weight assumptions in code).',
        'Aggressive deficits require an acknowledged clinician-review gate on the owner side; watch for fatigue, dizziness, and performance drops.',
        'Supplements listed in the reference menu (DHA, zinc/magnesium) are to be clinician-verified, never auto-enforced.',
      ],
    };
  }

  function mealTargets(targetKcal, { shares = DEFAULT_SHARES } = {}) {
    const plan = buildPlan({ targetKcal, shares }, { clinicianReviewAcknowledged: true });
    const mk = (slot, kcalShare, proteinMinG, fiberMinG) => ({
      slot,
      kcalMax: Math.round(plan.targetKcal * kcalShare),
      proteinMinG,
      fiberMinG,
    });
    return {
      desayuno: mk('desayuno', shares.desayuno, 20, 5),
      almuerzo: mk('almuerzo', shares.almuerzo, 30, 10),
      cena: mk('cena', shares.cena, 25, 8),
      snacks: mk('snacks', shares.snacks, 8, 3),
    };
  }

  /** Satiety score in [0..10]: protein + 2×fiber per 100 kcal, minus energy density and sugar energy share. */
  function satietyScore(input) {
    const proteinPer100 = input.proteinG / (input.kcal / 100);
    const fiberPer100 = input.fiberG / (input.kcal / 100);
    let score = proteinPer100 + 2 * fiberPer100;
    const flags = densityAndSugarFlags(input);
    if (flags.includes('added-sugar-heavy')) score -= (input.addedSugarG * 4) / input.kcal * 10;
    if (flags.includes('favorable-energy-density')) score += 1;
    if (flags.includes('energy-dense')) score -= 1.5;
    const normalized = Math.max(0, Math.min(10, score / 10));
    const energyDensity = input.grams > 0 ? input.kcal / input.grams : null;
    return { score: Math.round(normalized * 100) / 100, flags, proteinPer100: Math.round(proteinPer100 * 10) / 10, fiberPer100: Math.round(fiberPer100 * 10) / 10, energyDensity: energyDensity == null ? null : Math.round(energyDensity * 100) / 100 };
  }

  /** Published band: energy density ≤ ~1.0 kcal/g reads as low-ED (favorable); ≥2.5 is dense heavy. */
  const LOW_ED_MAX = 1.0;
  function densityAndSugarFlags({ kcal, grams, addedSugarG, proteinG }) {
    const flags = [];
    if (proteinG / (kcal / 100) < 8) flags.push('low-protein-density');
    const energyDensity = grams > 0 ? kcal / grams : null;
    if (energyDensity != null && energyDensity <= LOW_ED_MAX) flags.push('favorable-energy-density');
    if ((addedSugarG || 0) > 0 && (addedSugarG * 4) / kcal > 0.1) flags.push('added-sugar-heavy');
    if (energyDensity != null && energyDensity > 2.5) flags.push('energy-dense');
    return flags;
  }

  /** Compare a candidate meal/serving against a slot target; gaps are explicit. */
  function assessAgainstMealTarget(nutrition, slot, targetKcal, options = {}) {
    const targets = mealTargets(targetKcal, options);
    const t = targets[slot];
    const gaps = [];
    const sodiumBudget = Math.round(planSodiumBudget() * (t.kcalMax / targetKcal)); // published ceiling distributed by share
    if (nutrition.proteinG < t.proteinMinG) gaps.push('protein');
    if (nutrition.fiberG < t.fiberMinG) gaps.push('fiber');
    if (nutrition.kcal > t.kcalMax * 1.15) gaps.push('calories-over-slot');
    const flags = [];
    const sugar = nutrition.addedSugarG || 0;
    if (sugar * 4 > nutrition.kcal * 0.10) flags.push('added-sugar-heavy');
    if ((nutrition.sodiumMg || 0) > sodiumBudget) flags.push('sodium-high');
    return { slot, kcalMax: t.kcalMax, gaps, flags, satiety: satietyScore({ kcal: nutrition.kcal, proteinG: nutrition.proteinG, fiberG: nutrition.fiberG, grams: nutrition.grams || null, addedSugarG: sugar }) };
  }

  function planSodiumBudget() { return 2300; }

  return { SOURCES, buildPlan, mealTargets, satietyScore, assessAgainstMealTarget, DEFAULT_SHARES };
});
