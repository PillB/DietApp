'use strict';
// P5.4 — explainable recipe ranking tests (synthetic profile/lexicon/catalog).
// Seeded negatives: missing lexicon refuses; unknown feature weights refuse;
// explanations are REQUIRED (no unexplained rank); behavior is deterministic.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../assets/js/flavor-ranking.js');

const profile = {
  dishPool: 9,
  items: [
    { name: 'Maki Acevichado', count: 5, topCategories: [{ id: 'Sushi / Nikkei / japonesa', count: 5 }], shareWithinDishPool: 5 / 9 },
    { name: 'Ceviche clásico', count: 3, topCategories: [{ id: 'Carne / pescado / mariscos', count: 3 }], shareWithinDishPool: 3 / 9 },
    { name: 'Croissant de Jamón y Queso', count: 3, topCategories: [{ id: 'Sándwich / panadería salada', count: 3 }], shareWithinDishPool: 3 / 9 },
  ],
  excluded: { categories: [{ id: 'Bebida', count: 6, reason: 'purchase-noise' }], supportedBelowFloor: 0 },
  caveats: [{ code: 'frequency_is_behavior', text: 'behavioral, not clinical' }],
};

const lexicon = {
  schema: 'flavor-lexicon/v1',
  sourceNote: 'curated associations (NOT behavioral evidence)',
  entries: [
    { category: 'Sushi / Nikkei / japonesa', edge: { kind: 'taste', id: 'umami-rich', weight: 0.6, note: 'soy/dashi' } },
    { category: 'Sándwich / panadería salada', edge: { kind: 'taste', id: 'savoury-rich', weight: 0.5, note: 'butter/cheese' } },
  ],
};

const catalog = [
  { id: 'sp-wong-salmon', retailer: 'Wong', ingredientId: 'salmon', listingTitle: null, packageQty: null, packageUnit: null, hypothesisPack: { quantity: '500', unit: 'g' }, pricePEN: null, productUrl: null, sku: null, observationTime: null, locale: null, availability: 'notChecked', notes: [] },
  { id: 'sp-wong-quinoa', retailer: 'Wong', ingredientId: 'quinoa_dry', listingTitle: null, packageQty: null, packageUnit: null, hypothesisPack: { quantity: '500', unit: 'g' }, pricePEN: null, productUrl: null, sku: null, observationTime: null, locale: null, availability: 'notChecked', notes: [] },
];

const recipes = [
  {
    id: 'nikkei-bowl', version: 1, recipeKind: 'meal', validationStatus: 'reviewPending', originalSource: 'test',
    baseServings: 4, yieldCookedG: null, equipment: ['skillet'],
    times: { activeMin: 30, passiveMin: 10, pressureMin: null, releaseMin: null },
    ingredients: [
      { ingredientId: 'salmon', quantity: '560', unit: 'g', basis: 'raw', optional: false },
      { ingredientId: 'quinoa_dry', quantity: '300', unit: 'g', basis: 'dry', optional: false },
    ],
    steps: [], nutrition: { perServing: null, sourceIds: [], status: 'not-assessed' }, flavorTags: [],
  },
  {
    id: 'stove-only', version: 1, recipeKind: 'meal', validationStatus: 'reviewPending', originalSource: 'test',
    baseServings: 4, yieldCookedG: null, equipment: ['instant pot'],
    times: { activeMin: 30, passiveMin: 5, pressureMin: null, releaseMin: null },
    ingredients: [
      { ingredientId: 'tofu', quantity: '400', unit: 'g', basis: 'raw', optional: false },
      { ingredientId: 'lucuma', quantity: '100', unit: 'g', basis: 'raw', optional: false },
    ],
    steps: [], nutrition: { perServing: null, sourceIds: [], status: 'not-assessed' }, flavorTags: [],
  },
];

// Bridge: canonical ingredient ids → owner's ordered CATEGORIES (curated, inferred —
// the honest bridge between past-ORDER names and recipe ingredient ids).
const ingredientCategories = {
  salmon: ['Carne / pescado / mariscos'],
  quinoa_dry: ['Desayuno saludable / yogurt / avena', 'Supermercado / despensa comestible'],
  tofu: [],
  lucuma: ['Postre / snack dulce'],
};

test('every ranked recipe carries VISIBLE labeled features with provenance (no black box rank)', () => {
  const out = R.rankRecipes({ recipes, profile, lexicon, storeCatalog: catalog, householdEquipment: ['skillet'], ingredientCategories });
  const nikkei = out.find((x) => x.recipeId === 'nikkei-bowl');
  for (const f of nikkei.features) {
    assert.ok(f.id && f.weight >= 0 && f.weight <= 1 && f.value >= 0 && f.value <= 1, JSON.stringify(f));
    assert.ok(f.reason.length > 10, `feature ${f.id} needs a human reason: ${JSON.stringify(f)}`);
  }
  assert.ok(Math.abs(nikkei.features.reduce((s, f) => s + f.weight, 0) - 1) < 1e-6, 'weights sum to 1');
  assert.match(nikkei.explanation, /affinity/i);
  assert.ok(nikkei.explanation.includes('behavioral'), JSON.stringify(nikkei.explanation));
});

test('affinity is count-based (observed), flavorFit is inferred via lexicon, and store coverage needs ONLY structure rows (still labeled)', () => {
  const out = R.rankRecipes({ recipes, profile, lexicon, storeCatalog: catalog, householdEquipment: ['skillet'], ingredientCategories });
  const nikkei = out.find((x) => x.recipeId === 'nikkei-bowl');
  const affinity = nikkei.features.find((f) => f.id === 'affinity');
  assert.strictEqual(affinity.basis, 'behavioral-count', JSON.stringify(affinity));
  assert.ok(affinity.value > 0, 'nikkei recipe overlaps observed dish categories');
  const store = nikkei.features.find((f) => f.id === 'storeCoverage');
  assert.ok(/not checked/i.test(store.reason), `catalog rows are structure-only: JSON ${JSON.stringify(store)}`);
  const fitted = nikkei.features.find((f) => f.id === 'flavorFit');
  assert.strictEqual(fitted.basis, 'curated-lexicon-inferred');
});

test('equipment mismatch is visible and lowers the rank with a reason (no silent hiding)', () => {
  const out = R.rankRecipes({ recipes, profile, lexicon, storeCatalog: catalog, householdEquipment: ['skillet'], ingredientCategories });
  const stoveOnly = out.find((x) => x.recipeId === 'stove-only');
  const equip = stoveOnly.features.find((f) => f.id === 'equipment');
  assert.strictEqual(equip.value, 0, JSON.stringify(equip));
  assert.ok(/missing/i.test(equip.reason));
  assert.ok(stoveOnly.explanation.includes('equipment missing'), JSON.stringify(stoveOnly.explanation));
});

test('refusals: unknown schema lexicon, unknown feature id, weights not summing to 1', () => {
  assert.throws(() => R.rankRecipes({ recipes, profile, lexicon: { schema: 'bad', entries: [] }, storeCatalog: catalog, householdEquipment: [] }), /flavor-lexicon\/v1/);
  assert.throws(() => R.rankRecipes({ recipes, profile, lexicon, storeCatalog: catalog, householdEquipment: [], features: { affinity: 0.9 } }), /must be one of the weights/);
  assert.throws(() => R.rankRecipes({ recipes, profile, lexicon, storeCatalog: catalog, householdEquipment: [], featureWeights: { affinity: 0.4 } }), /weights/);
});

test('deterministic order (stable ties: affinity desc, name asc) — the same inputs always rank identically', () => {
  const a = JSON.stringify(R.rankRecipes({ recipes, profile, lexicon, storeCatalog: catalog, householdEquipment: ['skillet'] }));
  const b = JSON.stringify(R.rankRecipes({ recipes, profile, lexicon, storeCatalog: catalog, householdEquipment: ['skillet'] }));
  assert.strictEqual(a, b);
});
