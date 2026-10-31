'use strict';
// LEDGER-D48 — seeded-negative: an inverted date range must be REFUSED at the
// engine (inverted_range), not silently emptied. Proves the checker CAN fail.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SHOP = require('../assets/js/shopping-core.js');

const FIXTURE_RECIPE = {
  id: 'fish-bowl', version: 1, defaultYield: 2,
  dietTags: ['dinner'], ingredients: [],
};

const validEntry = {
  id: 'e1', localDate: '2026-11-03', slot: 'dinner', recipeId: 'fish-bowl',
  version: 1, portions: 2, repeatRuleId: null, pantryOverride: null,
};

test('seeded-negative: from > to refuses with inverted_range (RED if silently empty)', () => {
  const out = SHOP.buildShoppingList({
    recipes: [FIXTURE_RECIPE],
    planEntries: [validEntry],
    from: '2026-11-10',
    to: '2026-11-01',
  });
  assert.strictEqual(out.refused, true, JSON.stringify(out));
  assert.deepEqual(out.errors, [{ code: 'inverted_range' }], JSON.stringify(out.errors));
});

test('control: same entries in a normal range are NOT refused (test can pass only via refusal, never by accident)', () => {
  const out = SHOP.buildShoppingList({
    recipes: [FIXTURE_RECIPE],
    planEntries: [validEntry],
    from: '2026-11-01',
    to: '2026-11-07',
  });
  // empty recipe list may yield 0 lines but never 'inverted_range'
  assert.ok(!String(out.errors && out.errors.map((e) => e.code)).includes('inverted_range'));
});

test('edge: from === to is valid (single-day shopping)', () => {
  const out = SHOP.buildShoppingList({
    recipes: [FIXTURE_RECIPE],
    planEntries: [validEntry],
    from: '2026-11-03',
    to: '2026-11-03',
  });
  assert.ok(!String(out.errors && out.errors.map((e) => e.code)).includes('inverted_range'));
});
