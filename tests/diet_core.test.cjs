'use strict';
// P-Diet — target/satiety engine tests (published-guide structural values, not clinical prescriptions).
// Seeded negatives: aggressive numbers BELOW the safety floor refuse; recipes missing fiber don't score as "good"; unrecognized policy refuses rather than defaults.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../assets/js/diet-core.js');

test('sources are published-guide derived (no invented numbers; no personal identity anywhere)', () => {
  assert.ok(D.SOURCES.length >= 3);
  assert.ok(JSON.stringify(D.SOURCES).includes('protein 1.2-1.6 g/kg'));
});

test('deficit plan: aggressive requires acknowledged review; 1200 kcal floor is the hard gate', () => {
  assert.throws(() => D.buildPlan({ targetKcal: 1100 }, { clinicianReviewAcknowledged: true }), (e) => e.code === 'below_floor');
  assert.throws(() => D.buildPlan({ targetKcal: 1450 }, {}), (e) => e.code === 'unacknowledged_aggressive', 'below the 1500 published anchor requires the acknowledgment');
  const p1 = D.buildPlan({ targetKcal: 1500 }, {});
  assert.strictEqual(p1.category, 'moderate', '1500 formulaically stays the anchor of non-aggressive');
  const p2 = D.buildPlan({ targetKcal: 1200 }, { clinicianReviewAcknowledged: true });
  assert.strictEqual(p2.category, 'aggressive');
  const p3 = D.buildPlan({ targetKcal: 1600 }, { clinicianReviewAcknowledged: true });
  assert.deepStrictEqual(p3.dailyFiberMin, 25);
});

test('meal targets sum exactly to the day target and apply floor structure', () => {
  const t = D.mealTargets(1500, {});
  // defaults .25/.35/.30/.10
  assert.strictEqual(t.desayuno.kcalMax + t.almuerzo.kcalMax + t.cena.kcalMax + t.snacks.kcalMax, 1500);
  assert.ok(t.desayuno.proteinMinG >= 20, 'satiety: breakfast needs ~20g protein floor');
  assert.ok(t.almuerzo.proteinMinG >= 30, 'satiety: lunch is the biggest protein anchor');
  assert.ok(t.cena.proteinMinG >= 25);
  assert.ok(t.desayuno.fiberMinG >= 5 && t.almuerzo.fiberMinG >= 10);
});

test('satiety scoring favors protein+fiber per 100 kcal and penalizes energy-dense sweet items', () => {
  const salmonPlate = D.satietyScore({ kcal: 400, proteinG: 40, fiberG: 8, grams: 400, addedSugarG: 0 });
  const cookiePack = D.satietyScore({ kcal: 400, proteinG: 5, fiberG: 1.6, grams: 80, addedSugarG: 18 });
  assert.ok(salmonPlate.score > cookiePack.score, `${salmonPlate.score} vs ${cookiePack.score}`);
  assert.strictEqual(cookiePack.flags.includes('low-protein-density'), true, JSON.stringify(cookiePack));
  assert.ok(salmonPlate.flags.includes('favorable-energy-density'), JSON.stringify(salmonPlate));
  assert.ok(cookiePack.flags.includes('energy-dense'), JSON.stringify(cookiePack));
});

test('recipe assessment vs targets: unsatisfied floors surface as explicit gaps, never silent pass', () => {
  const r = D.assessAgainstMealTarget({ kcal: 350, proteinG: 12, fiberG: 2, sodiumMg: 1300, addedSugarG: 7 }, 'almuerzo', 1500);
  assert.ok(r.gaps.includes('protein'), JSON.stringify(r));
  assert.ok(r.gaps.includes('fiber'));
  assert.ok(r.flags.includes('sodium-high'), JSON.stringify(r.flags));
  const good = D.assessAgainstMealTarget({ kcal: 520, proteinG: 32, fiberG: 10, sodiumMg: 600, addedSugarG: 0 }, 'almuerzo', 1500);
  assert.strictEqual(good.gaps.length, 0, JSON.stringify(good));
});

test('no clinical guarantee slips: outputs carry the non-diagnosis caveat every time', () => {
  const p = D.buildPlan({ targetKcal: 1600 }, {});
  assert.ok(p.caveats.some((x) => /not a medical prescription/i.test(x)));
});
