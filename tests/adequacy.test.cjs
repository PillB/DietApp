'use strict';
// P-Diet — weekly micronutrient adequacy engine (LEDGER-8).
// Published RDA targets (NIH ODS tables; adult values, NOT individualized).
// Seeded negatives: empty weeks flagged inadequate; sex-specific iron RDA proven.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const A = require('../assets/js/adequacy-core.js');

const ROOT = path.resolve(__dirname, '..');
const comp = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference/food-composition-tpca.v1.json'), 'utf8')).rows;
const weighedSource = JSON.parse(fs.readFileSync(path.join(ROOT, 'nutrition-reviewed.json'), 'utf8'));
const imported = require('../assets/js/import-weighed.js').importWeighed(weighedSource.curatedRecipes).recipes;

test('RDA constants circulate with their source; women/men differ only where the science differs', () => {
  assert.ok(A.RDA_SOURCE.includes('NIH Office of Dietary Supplements'));
  assert.strictEqual(A.rda.vitaminAUg, 900);
  assert.strictEqual(A.rda.vitaminCMg, 90);
  assert.strictEqual(A.rda.folateUg, 400);
  assert.strictEqual(A.rda.calciumMg, 1000);
  assert.strictEqual(A.rda.ironMg.male, 8);
  assert.strictEqual(A.rda.ironMg.female, 18);
  assert.strictEqual(A.rda.zincMg.male, 11);
  assert.strictEqual(A.rda.zincMg.female, 8);
  assert.strictEqual(A.rda.sodiumCeilingMg, 2300);
});

test('weekly aggregation: nikkei ×2 portions/day × 7 days accumulates macro+micro totals', () => {
  const nikkei = imported.find((r) => r.id === 'nikkei-salmon-bowl');
  const week = A.aggregateWeek([{ recipe: nikkei, portionsPerDay: 2, days: 7 }], comp);
  assert.ok(Math.abs(week.totals.kcal - 693.2 * 14) < 1, `kcal ${week.totals.kcal}`);
  assert.ok(week.totals.vitaminAUg > 0, 'vitamin A accumulates from the salmon row');
  assert.strictEqual(week.perServingBasis, 'computed-pending-weighin', 'honest status propagates');
});

test('adequacy band: 7×2 nikkei covers vitamin A for a male RDA and the Na stays far under ceiling', () => {
  const nikkei = imported.find((r) => r.id === 'nikkei-salmon-bowl');
  const week = A.adequacyWeek([{ recipe: nikkei, portionsPerDay: 2, days: 7 }], comp, { sex: 'male' });
  const byId = Object.fromEntries(week.nutrients.map((n) => [n.id, n]));
  assert.strictEqual(byId.vitaminA.status, 'adequate', JSON.stringify(byId.vitaminA));
  assert.strictEqual(byId.sodium.status, 'under-ceiling', JSON.stringify(byId.sodium));
  assert.strictEqual(byId.fiber.status === 'adequate' || byId.fiber.status === 'below-rda', true, 'fiber assessed honestly either way');
});

test('seeded negative: an empty week is flagged inadequate (never rubber-stamped)', () => {
  const week = A.adequacyWeek([], comp, { sex: 'male' });
  const byId = Object.fromEntries(week.nutrients.map((n) => [n.id, n]));
  assert.strictEqual(byId.vitaminA.status, 'inadequate-no-data');
});

test('seeded negative: female iron RDA is the science-correct 18 mg (band switches by sex)', () => {
  const nikkei = imported.find((r) => r.id === 'nikkei-salmon-bowl');
  const weekF = A.adequacyWeek([{ recipe: nikkei, portionsPerDay: 2, days: 7 }], comp, { sex: 'female' });
  const byIdF = Object.fromEntries(weekF.nutrients.map((n) => [n.id, n]));
  assert.strictEqual(byIdF.iron.rdaTarget, 18, 'female iron RDA is 18 mg');
  assert.strictEqual(byIdF.iron.status === 'adequate' || byIdF.iron.status === 'below-rda', true);
});
