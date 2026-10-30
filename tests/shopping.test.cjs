'use strict';
// P3.1 — shopping aggregation tests (pure engine). Every case comes from
// docs/DATA_CONTRACT.md §Required transformations or the handover release gates.
// Expert-honest rule baked into expectations: NO packaged-size invention —
// count lines get ceil() produce recommendation; mass/volume lines that lack a
// recorded package get needsPackageDecision instead of a guessed bundle.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../assets/js/quantity.js');
const SHOP = require('../assets/js/shopping-core.js');

const R = (id, baseServings, uses) => ({
  id, version: 1, recipeKind: 'meal', validationStatus: 'reviewPending',
  originalSource: 'test', baseServings, yieldCookedG: null, equipment: [],
  times: { activeMin: 10, passiveMin: 5, pressureMin: null, releaseMin: null },
  ingredients: uses, steps: [], nutrition: { perServing: null, sourceIds: [], status: 'not-assessed' }, flavorTags: [],
});
const use = (id, q, unit, basis, optional = false) => ({ ingredientId: id, quantity: q, unit, basis, optional });
const plan = (id, date, portions, recipeId = 'r_onion_bowl', version = 1) => ({
  id, localDate: date, slot: 'dinner', recipeId, version, portions, repeatRuleId: null, pantryOverride: null,
});

const RECIPES = [
  R('r_onion_bowl', 4, [use('red_onion', '1/2', 'count', 'raw'), use('rice_brown', '500', 'g', 'dry'), use('olive_oil', '30', 'ml', 'raw', /* optional */ true)]),
  R('r_rice_bowl', 4, [use('red_onion', '2', 'count', 'raw'), use('rice_brown', '3/4', 'kg', 'dry')]),
];

function lineFor(result, ingredientId, unit) {
  return result.lines.find((l) => l.ingredientId === ingredientId && l.unit === unit);
}

test('contract case: (1/2 + 2) onions across two planned dates at full scale = 2.5 count', () => {
  const entries = [plan('p1', '2026-11-02', 2), plan('p2', '2026-11-03', 2), plan('p3', '2026-11-20', 4, 'r_rice_bowl')];
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: entries, from: '2026-11-01', to: '2026-11-30' });
  const onion = lineFor(out, 'red_onion', 'count');
  assert.ok(Q.eq(onion.needed, Q.parseExact('2.5')), JSON.stringify(onion));
  assert.deepStrictEqual(onion.sourcePlanEntryIds.sort(), ['p1', 'p2', 'p3'], 'provenance of which entries contributed');
});

test('portion scaling: 1 serving of a 4-serving recipe = 0.25× (rice 125g, oil 7.5ml, onion 1/8)', () => {
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: [plan('p1', '2026-11-02', 1)], from: '2026-11-01', to: '2026-11-30', optionalChoices: { olive_oil: true } });
  assert.ok(Q.eq(lineFor(out, 'rice_brown', 'g').needed, Q.parseExact('125')));
  assert.ok(Q.eq(lineFor(out, 'olive_oil', 'ml').needed, Q.parseExact('7.5')));
  assert.ok(Q.eq(lineFor(out, 'red_onion', 'count').needed, Q.parseExact('1/8')));
});

test('fractional onion 1/8 → purchase recommendation ceil = 1 whole onion (produce unit default)', () => {
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: [plan('p1', '2026-11-02', 1)], from: '2026-11-01', to: '2026-11-30' });
  const onion = lineFor(out, 'red_onion', 'count');
  assert.ok(Q.eq(onion.purchaseRecommendation.quantity, Q.parseExact('1')));
  assert.strictEqual(onion.purchaseRecommendation.rule, 'ceil-count-default');
});

test('mass merge after same-family conversion: 500 g + 3/4 kg = 1250 g in ONE line', () => {
  const entries = [plan('p1', '2026-11-01', 4), plan('p2', '2026-11-02', 4, 'r_rice_bowl')];
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: entries, from: '2026-11-01', to: '2026-11-30' });
  const lines = out.lines.filter((l) => l.ingredientId === 'rice_brown');
  assert.strictEqual(lines.length, 1);
  assert.strictEqual(lines[0].unit, 'g');
  assert.ok(Q.eq(lines[0].needed, Q.parseExact('1250')));
  // volume merge: 30 ml + 0.5 l = 530 ml
  const oilEntries = [plan('p1', '2026-11-01', 4), plan('p2', '2026-11-02', 4, 'r_oil_bowl')];
  const recipes2 = [...RECIPES, R('r_oil_bowl', 4, [use('olive_oil', '1/2', 'l', 'raw')])];
  const out2 = SHOP.buildShoppingList({ recipes: recipes2, planEntries: oilEntries, from: '2026-11-01', to: '2026-11-30', optionalChoices: { olive_oil: true } });
  const oil = out2.lines.filter((l) => l.ingredientId === 'olive_oil');
  assert.strictEqual(oil.length, 1);
  assert.ok(Q.eq(oil[0].needed, Q.parseExact('530')), 'l and ml merge into base ml');
});

test('no invention: ml/g lines without recorded packaging are needsPackageDecision, never guessed bundles', () => {
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: [plan('p1', '2026-11-01', 4)], from: '2026-11-01', to: '2026-11-30' });
  const rice = lineFor(out, 'rice_brown', 'g');
  assert.strictEqual(rice.purchaseRecommendation, null);
  assert.ok(rice.warnings.includes('needs_package_decision'));
  assert.strictEqual(out.warnings.some((w) => w.code === 'needs_package_decision' && w.ingredientId === 'rice_brown'), true);
});

test('optional ingredient excluded unless chosen, with an explicit audit trail when included', () => {
  const entries = [plan('p1', '2026-11-01', 4)];
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: entries, from: '2026-11-01', to: '2026-11-30' });
  assert.strictEqual(lineFor(out, 'olive_oil', 'ml'), undefined);
  assert.ok(out.warnings.some((w) => w.code === 'optional_excluded' && w.ingredientId === 'olive_oil'));
  const out2 = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: entries, from: '2026-11-01', to: '2026-11-30', optionalChoices: { olive_oil: true } });
  assert.ok(Q.eq(lineFor(out2, 'olive_oil', 'ml').needed, Q.parseExact('30')));
});

test('pantry offsets same id+unit+basis only: pantry 1/2 count zeroes a 1/2 need; cooked-grams pantry can NEVER offset dry grams', () => {
  const entries = [plan('p1', '2026-11-01', 4)]; // full scale → onion 1/2, rice 500g dry
  const out = SHOP.buildShoppingList({
    recipes: RECIPES, planEntries: entries, from: '2026-11-01', to: '2026-11-30',
    pantry: [{ ingredientId: 'red_onion', quantity: '1/2', unit: 'count', basis: 'raw' }],
  });
  const onion = lineFor(out, 'red_onion', 'count');
  assert.ok(Q.eq(onion.netRequired, Q.parseExact('0')), JSON.stringify(onion));
  assert.ok(Q.eq(onion.pantry, Q.parseExact('1/2')), 'pantry line records consumed amount min(have, need)');
  const riceEntries = [plan('p1', '2026-11-01', 2)]; // 2/4 scale → rice 250g dry
  const out2 = SHOP.buildShoppingList({
    recipes: RECIPES, planEntries: riceEntries, from: '2026-11-01', to: '2026-11-30',
    pantry: [{ ingredientId: 'rice_brown', quantity: '900', unit: 'g', basis: 'cooked' }],
  });
  const rice = lineFor(out2, 'rice_brown', 'g');
  assert.ok(Q.eq(rice.needed, Q.parseExact('250')), 'dry need unchanged');
  assert.ok(Q.eq(rice.netRequired, Q.parseExact('250')), 'cooked grams must not offset dry need');
  assert.ok(rice.warnings.includes('pantry_basis_mismatch'));
});

test('raw+cooked never summed from recipes (two bases → two lines, merge refusal is a warning, not silence)', () => {
  const recipes = [R('r_mix', 2, [use('chicken', '400', 'g', 'raw'), use('chicken', '300', 'g', 'cooked')])];
  const out = SHOP.buildShoppingList({ recipes, planEntries: [plan('p1', '2026-11-01', 2, 'r_mix')], from: '2026-11-01', to: '2026-11-30' });
  const lines = out.lines.filter((l) => l.ingredientId === 'chicken');
  assert.strictEqual(lines.length, 2, 'basis-distinct lines stay separate');
  assert.deepStrictEqual(lines.map((l) => l.basis).sort(), ['cooked', 'raw']);
  assert.ok(out.warnings.some((w) => w.code === 'basis_lines_not_merged'), 'no silent combine attempt: audit warning present');
});

test('quarantined/unknown recipes in plan produce a REFUSAL, never partial math', () => {
  const entries = [plan('p1', '2026-11-01', 4), plan('p2', '2026-11-02', 2, 'artichoke-benedict')];
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: entries, from: '2026-11-01', to: '2026-11-30', quarantine: [{ id: 'artichoke-benedict', shoppingMathLocked: true }] });
  assert.strictEqual(out.refused, true);
  assert.ok(out.errors.some((e) => e.code === 'shopping_math_locked_recipe' && e.recipeId === 'artichoke-benedict'));
  // even recipes present in range produce NO lines once refusal triggers (atomicity)
  assert.strictEqual(out.lines.length, 0);
});

test('empty plan in range → empty list, no fake zero-quantity filler', () => {
  const out = SHOP.buildShoppingList({ recipes: RECIPES, planEntries: [plan('p1', '2026-11-01', 4)], from: '2026-12-01', to: '2026-12-07' });
  assert.strictEqual(out.lines.length, 0);
  assert.strictEqual(out.refused, false);
});
