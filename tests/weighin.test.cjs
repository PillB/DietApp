'use strict';
// LEDGER-2 tooling — P4.4 kitchen weigh-in worksheet tests (pure logic).
// The worksheet lets the OWNER log real per-ingredient weights + measured yield;
// promotion to 'weighed-pending-review' requires EVERY non-optional ingredient
// weighed AND the yield measured — partial weigh-ins stay flagged honestly.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../assets/js/weighin-core.js');

const recipe = {
  id: 'muesli_frutado_diet', baseServings: 1,
  ingredients: [
    { ingredientId: 'avena_hojuelas', quantity: '30', unit: 'g', basis: 'dry', optional: false },
    { ingredientId: 'yogurt_estilo_island', quantity: '245', unit: 'g', basis: 'raw', optional: false },
    { ingredientId: 'fruta_picada_estado', quantity: '140', unit: 'g', basis: 'raw', optional: false },
    { ingredientId: 'canela_polvo', quantity: '2', unit: 'g', basis: 'dry', optional: true },
  ],
};

test('full weigh-in: all non-optional ingredients + yield → promoted to weighed-pending-review', () => {
  const w = W.evaluateWeighIn(recipe, {
    weighIns: { avena_hojuelas: 30.2, yogurt_estilo_island: 244.0, fruta_picada_estado: 138.5 },
    yieldG: 400,
  });
  assert.strictEqual(w.status, 'weighed-pending-review');
  assert.strictEqual(w.missing.length, 0);
  assert.strictEqual(w.variancePct < 2, true, JSON.stringify(w));
});

test('partial weigh-in (one ingredient missing) stays honestly un-promoted', () => {
  const w = W.evaluateWeighIn(recipe, {
    weighIns: { avena_hojuelas: 30.2, yogurt_estilo_island: 244.0 },
    yieldG: 400,
  });
  assert.strictEqual(w.status, 'incomplete-weighin');
  assert.deepStrictEqual(w.missing, ['fruta_picada_estado']);
});

test('missing yield (pot grams unknown) refuses promotion even with all ingredients weighed', () => {
  const w = W.evaluateWeighIn(recipe, {
    weighIns: { avena_hojuelas: 30.2, yogurt_estilo_island: 244.0, fruta_picada_estado: 138.5 },
    yieldG: null,
  });
  assert.strictEqual(w.status, 'incomplete-weighin');
  assert.ok(w.missing.includes('yieldG'), JSON.stringify(w));
});

test('optional ingredients do NOT block promotion (canela absent is fine)', () => {
  const w = W.evaluateWeighIn(recipe, {
    weighIns: { avena_hojuelas: 30.2, yogurt_estilo_island: 244.0, fruta_picada_estado: 138.5 },
    yieldG: 395,
  });
  assert.strictEqual(w.status, 'weighed-pending-review');
  assert.strictEqual(w.variancePct >= 0, true);
});

test('variance math: |actual−planned| summed vs planned total (25% over → flagged)', () => {
  const w = W.evaluateWeighIn(recipe, {
    weighIns: { avena_hojuelas: 45, yogurt_estilo_island: 300, fruta_picada_estado: 170 },
    yieldG: 500,
  });
  assert.ok(w.variancePct > 20, `variance ${w.variancePct}% should exceed 20`);
  assert.ok(w.flags.includes('portions-may-differ'), JSON.stringify(w.flags));
});

test('seeded negative: nonsense weigh-in values (negative grams) refuse', () => {
  const w = W.evaluateWeighIn(recipe, {
    weighIns: { avena_hojuelas: -5, yogurt_estilo_island: 244, fruta_picada_estado: 138.5 },
    yieldG: 400,
  });
  assert.strictEqual(w.status, 'invalid-weighin');
});
