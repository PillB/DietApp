'use strict';
// Deficit-week assembly tests (synthetic fixtures, no private data).
// Seeded negatives: sub-floor target refuses; unacknowledged aggressive refuses;
// slot with no candidate warns; DietCore gates reused; entries schema-valid.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/js/domain-schema.js');
const DP = require('../assets/js/deficit-planner.js');

const profile = { dishPool: 9, items: [{ name: 'Ceviche', count: 3, topCategories: [{ id: 'Carne / pescado / mariscos', count: 3 }], shareWithinDishPool: 3 / 9 }], excluded: { categories: [], supportedBelowFloor: 0 }, caveats: [] };
const lexicon = { schema: 'flavor-lexicon/v1', sourceNote: 's', entries: [] };
const catalog = [{ id: 'sp-x', retailer: 'Wong', ingredientId: 'salmon' }];
const ingredientCategories = { salmon: ['Carne / pescado / mariscos'], tofu: [] };

const mkRecipe = (id, baseServings, eq) => ({ id, version: 1, recipeKind: 'meal', validationStatus: 'reviewPending', originalSource: 't', baseServings, yieldCookedG: null, equipment: eq, times: { activeMin: 5, passiveMin: 5, pressureMin: null, releaseMin: null }, ingredients: [{ ingredientId: 'salmon', quantity: '100', unit: 'g', basis: 'raw', optional: false }], steps: [], nutrition: { perServing: null, sourceIds: [], status: 'not-assessed' }, flavorTags: [] });

const recipes = [mkRecipe('fish-bowl', 4, ['skillet']), mkRecipe('tofu-bowl', 4, ['skillet'])];
const slotHints = { almuerzo: ['fish-bowl', 'tofu-bowl'], cena: ['tofu-bowl'] };

test('week assembles 7 × slot entries (schema-valid plan entries) with ranked picks carrying labeled features', () => {
  const out = DP.planDeficitWeek({
    recipes, slotHints, targetKcal: 1500, policy: {},
    startFromIso: '2026-11-02', profile, lexicon, storeCatalog: catalog, householdEquipment: ['skillet'], ingredientCategories,
    defaultPortions: { almuerzo: 2, cena: 2, desayuno: 1, snacks: 1 },
  });
  assert.strictEqual(out.entries.length, Object.keys(slotHints).length * 7, JSON.stringify(out.entries.length));
  for (const e of out.entries) assert.deepStrictEqual(S.validatePlanEntry(e).errors, []);
  const fishPick = out.picks.find((p) => p.slot === 'almuerzo');
  assert.ok(fishPick.features.some((f) => f.id === 'affinity' && f.reason.length > 10), JSON.stringify(fishPick));
  assert.ok(fishPick.explanation.includes('Why this rank'), JSON.stringify(fishPick));
  const cenaPick = out.picks.find((p) => p.slot === 'cena');
  assert.strictEqual(cenaPick.recipeId, 'tofu-bowl', 'no-candidate slot empty; cena has only tofu offered');
  assert.ok(out.warnings.some((w) => /nutrition-pending/.test(w.code)), JSON.stringify(out.warnings));
});

test('DietCore gates: below 1200 and unacknowledged aggressive are refused BEFORE any entry exists', () => {
  assert.throws(() => DP.planDeficitWeek({ recipes, slotHints, targetKcal: 1100, policy: { clinicianReviewAcknowledged: true }, profile, lexicon, storeCatalog: catalog, householdEquipment: [], ingredientCategories }), (e) => e.code === 'below_floor');
  assert.throws(() => DP.planDeficitWeek({ recipes, slotHints, targetKcal: 1450, policy: {}, profile, lexicon, storeCatalog: catalog, householdEquipment: [], ingredientCategories }), (e) => e.code === 'unacknowledged_aggressive');
});

test('slots without candidates → warning, never empty fake rows', () => {
  const out = DP.planDeficitWeek({
    recipes, slotHints: { desayuno: [] }, targetKcal: 1500, policy: {},
    startFromIso: '2026-11-02', profile, lexicon, storeCatalog: catalog, householdEquipment: [], ingredientCategories,
    defaultPortions: {},
  });
  assert.strictEqual(out.entries.length, 0);
  assert.ok(out.warnings.some((w) => /no candidate/i.test(w.text) || /no candidate/i.test(w.code)), JSON.stringify(out.warnings));
});
