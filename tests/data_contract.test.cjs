'use strict';
// P1.1 — canonical domain model tests (docs/DATA_CONTRACT.md v0.1).
// Seeded-negative first: every validator rule is exercised by a case that MUST
// fail, so the validators are proven live (tautology prohibition, AGENTS.md).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/js/domain-schema.js');

const codes = (r) => r.errors.map((e) => e.code).sort();

const ingredient = {
  id: 'red_onion',
  name: { 'es-PE': 'cebolla roja', en: 'red onion' },
  family: 'allium',
  dimension: 'count',
  purchaseUnit: 'count',
  aliases: ['cebolla morada'],
  foodCompositionRef: null,
  allergenCodes: [],
};

test('contract example ingredient validates', () => {
  assert.deepStrictEqual(S.validateIngredient(ingredient).errors, []);
});

test('ingredient seeded negatives', () => {
  assert.ok(codes(S.validateIngredient({ ...ingredient, id: 'Red Onion!' })).includes('bad_id'));
  assert.ok(codes(S.validateIngredient({ ...ingredient, name: { 'es-PE': 'cebolla roja' } })).includes('name_missing_en'));
  assert.ok(codes(S.validateIngredient({ ...ingredient, purchaseUnit: 'g' })).includes('purchase_unit_wrong_dimension'));
  assert.ok(codes(S.validateIngredient({ ...ingredient, dimension: 'weird' })).includes('unknown_dimension'));
  assert.ok(codes(S.validateIngredient({ ...ingredient, aliases: [42] })).includes('bad_aliases'));
});

const recipe = {
  id: 'r1',
  version: 2,
  recipeKind: 'meal',
  validationStatus: 'unverified',
  originalSource: 'reference',
  baseServings: 4,
  yieldCookedG: null,
  equipment: ['skillet'],
  times: { activeMin: 20, passiveMin: 10, pressureMin: null, releaseMin: null },
  ingredients: [
    { ingredientId: 'red_onion', quantity: '1/2', unit: 'count', basis: 'raw', optional: false },
    { ingredientId: 'rice_brown', quantity: '300', unit: 'g', basis: 'dry', optional: false },
  ],
  steps: [{ id: 's1', order: 1, text: { en: 'slice' }, ingredients: ['red_onion'], timeMin: 5, targetTempC: null, checkpoint: 'translucent', hazardNotes: [] }],
  nutrition: { perServing: null, sourceIds: [], status: 'not-assessed' },
  flavorTags: [{ id: 'umami', evidenceIds: ['order-c32'], confidence: 'inferred' }],
};

test('contract example recipe version validates', () => {
  assert.deepStrictEqual(S.validateRecipeVersion(recipe).errors, []);
});

test('recipe seeded negatives (units, quantities, steps, pressure fields)', () => {
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, ingredients: [{ ingredientId: 'red_onion', quantity: '1/2.5', unit: 'count', basis: 'raw', optional: false }] })).includes('bad_quantity'));
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, ingredients: [{ ingredientId: 'red_onion', quantity: '-2', unit: 'count', basis: 'raw', optional: false }] })).includes('bad_quantity'));
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, ingredients: [{ ingredientId: 'red_onion', quantity: '2', unit: 'cups', basis: 'dry', optional: false }] })).includes('unit_wrong_dimension'));
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, ingredients: [{ ingredientId: '', quantity: '2', unit: 'count', basis: 'cooked', optional: true }] })).includes('missing_ingredient_id'));
  // count with 'dry' basis is incoherent (basis applies to mass/volume foods)
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, ingredients: [{ ingredientId: 'red_onion', quantity: '2', unit: 'count', basis: 'dry', optional: false }] })).includes('bad_basis'));
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, steps: [{ ...recipe.steps[0], order: 2 }, { ...recipe.steps[0], id: 's2', order: 1 }] })).includes('steps_not_ascending'));
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, steps: [{ ...recipe.steps[0], targetTempC: -5 }] })).includes('bad_target_temp'));
  // pressure times recorded without pressure equipment are invalid data, per P4.2 anti-inference rule
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, times: { activeMin: 20, passiveMin: 10, pressureMin: 30, releaseMin: 10 } })).includes('pressure_without_equipment'));
  assert.ok(codes(S.validateRecipeVersion({ ...recipe, baseServings: 0 })).includes('bad_base_servings'));
});

test('plan entry seeded negatives (localDate is calendar-validated, not format-only)', () => {
  const plan = { id: 'p1', localDate: '2026-11-02', slot: 'dinner', recipeId: 'r1', version: 2, portions: 2, repeatRuleId: null, pantryOverride: null };
  assert.deepStrictEqual(S.validatePlanEntry(plan).errors, []);
  // 2026-02-30 is format-valid but not a real day; UTC/parse traps are exactly why string+calendar validation is required
  assert.ok(codes(S.validatePlanEntry({ ...plan, localDate: '2026-02-30' })).includes('invalid_local_date'));
  assert.ok(codes(S.validatePlanEntry({ ...plan, localDate: '2026-13-01' })).includes('invalid_local_date'));
  assert.ok(codes(S.validatePlanEntry({ ...plan, slot: 'brunch' })).includes('unknown_slot'));
  assert.ok(codes(S.validatePlanEntry({ ...plan, portions: 0 })).includes('bad_portions'));
  assert.ok(codes(S.validatePlanEntry({ ...plan, portions: 2.5 })).includes('bad_portions'));
});

test('store match: provenance-free availability claims are impossible at schema level', () => {
  const match = { id: 'match-1', retailer: 'Wong', listingTitle: null, productUrl: null, sku: null, packageQty: 1, packageUnit: 'count', pricePEN: null, observationTime: null, locale: 'Lima / San Isidro', availability: 'unverified', matchConfidence: 'unverified', notes: [] };
  assert.deepStrictEqual(S.validateStoreMatch(match).errors, []);
  const claimed = { ...match, availability: 'verified', matchConfidence: 'verified', locale: 'Lima / San Isidro' };
  const r = codes(S.validateStoreMatch(claimed));
  assert.deepStrictEqual(r.sort(), ['claim_missing_observation_time', 'claim_missing_sku_or_url'], JSON.stringify(r));
  const bare = { ...match, availability: 'verified', matchConfidence: 'verified', locale: null };
  const rb = codes(S.validateStoreMatch(bare));
  assert.ok(rb.includes('claim_missing_locale'), JSON.stringify(rb));
  assert.ok(codes(S.validateStoreMatch({ ...match, retailer: 'BigBasket' })).includes('unknown_retailer'));
  assert.ok(codes(S.validateStoreMatch({ ...match, pricePEN: -3 })).includes('bad_price'));
  // date-only "timestamp" is not exact observation provenance (0 provenance-free claims gate)
  assert.ok(codes(S.validateStoreMatch({ ...claimed, observationTime: '2026-10-30' })).includes('claim_missing_observation_time'));
});

test('evidence record validates and round-trips losslessly', () => {
  const ev = { id: 'e1', sourceType: 'private_xlsx', ref: 'Food_Orders!A32', field: 'item_description', recordedAt: '2026-10-30T12:00:00-05:00' };
  assert.deepStrictEqual(S.validateEvidence(ev).errors, []);
  const round = JSON.parse(JSON.stringify(ev));
  assert.deepStrictEqual(S.validateEvidence(round), S.validateEvidence(ev));
  assert.ok(codes(S.validateEvidence({ ...ev, sourceType: 'vibes' })).includes('unknown_source_type'));
  assert.ok(codes(S.validateEvidence({ ...ev, recordedAt: '2026-10-30 12:00' })).includes('bad_timestamp'));
});

test('full fixture set round-trips through JSON losslessly', () => {
  assert.deepStrictEqual(S.validateRecipeVersion(JSON.parse(JSON.stringify(recipe))), S.validateRecipeVersion(recipe));
  assert.deepStrictEqual(S.validateIngredient(JSON.parse(JSON.stringify(ingredient))), S.validateIngredient(ingredient));
  assert.strictEqual(S.validateRecipeVersion(JSON.parse(JSON.stringify(recipe))).ok, true);
});
