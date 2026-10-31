'use strict';
// P-Diet — provisional computed perServing nutrition from the 42-row per100g
// source table (HONEST labeling: 'computed-pending-weighin' — NOT 'assessed')
// until the P4.4 owner weigh-in makes them lab-grade.
// Seeded negatives: missing row → null protein/fiber per use; unknown unit → refused.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const N = require('../assets/js/diet-nutrition-core.js');

const ROOT = path.resolve(__dirname, '..');
const composition = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference/food-composition-tpca.v1.json'), 'utf8')).rows;

test('per100g lookup: exact quantities (100g) match the source per100g row exactly', () => {
  const out = N.computeServingNutrition('quinoa_dry', '100', 'g', composition);
  assert.strictEqual(out.kcal, Math.round(composition.quinoa_dry.per100g.kcal));
  assert.strictEqual(out.proteinG, composition.quinoa_dry.per100g.proteinG);
});
test('scaled quantity: 50g of a 351kcal/100g row yields 175.5 (half), 200g doubles', () => {
  assert.strictEqual(N.computeServingNutrition('quinoa_dry', '50', 'g', composition).kcal, 175.5);
  assert.strictEqual(N.computeServingNutrition('quinoa_dry', '200', 'g', composition).kcal, 702);
});
test('count-based quantities: egg has a grams-per-unit map (55 g); unknown ids get unit_mass_unknown', () => {
  const egg = N.computeServingNutrition('egg', '1', 'count', composition);
  assert.strictEqual(egg.gramsServed, 55);
  const mystery = N.computeServingNutrition('mystery_fruit_diet', '1', 'count', composition);
  assert.strictEqual(mystery.kcal, null);
  assert.ok(mystery.flags.includes('no_composition_row'), JSON.stringify(mystery));
  const tofu = N.computeServingNutrition('tofu_thing', '2', 'count', composition);
  assert.strictEqual(tofu.kcal, null);
});

test('unknown ingredientId → nulls with flags (never invented)', () => {
  const out = N.computeServingNutrition('mystery_fruit_diet', '100', 'g', composition);
  assert.strictEqual(out.kcal, null);
  assert.ok(out.flags.includes('no_composition_row'), JSON.stringify(out));
});
test('seeded negative: curating a nonsense kcal number (non-numeric string) is caught as invalid value', () => {
  const broken = Object.assign({}, composition);
  broken.fake_row = { code: 'X1', per100g: { kcal: 'NaN', proteinG: null } };
  assert.throws(() => N.computeServingNutrition('fake_row', '100', 'g', broken), /bad kcal/);
});
