'use strict';
// P1.2 — importer tests against the REAL nutrition-reviewed.json plus
// seeded-negative synthetic inputs (non-exact quantities, unknown basis,
// legacy quarantine must be inert to shopping math).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../assets/js/domain-schema.js');
const I = require('../assets/js/import-weighed.js');

const ROOT = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'nutrition-reviewed.json'), 'utf8'));

test('all 7 weighed recipes import into schema-valid RecipeVersions', () => {
  const out = I.importWeighed(source.curatedRecipes);
  assert.strictEqual(out.recipes.length, 7, `expected 7 recipes, got ${out.recipes.length}`);
  for (const r of out.recipes) {
    const v = S.validateRecipeVersion(r);
    assert.deepStrictEqual(v.errors, [], `${r.id} invalid: ${JSON.stringify(v.errors)}`);
  }
});

test('import is non-destructive to honesty flags: reviewPending, not-assessed, no pressure inference', () => {
  for (const r of I.importWeighed(source.curatedRecipes).recipes) {
    assert.strictEqual(r.validationStatus, 'reviewPending');
    assert.strictEqual(r.nutrition.status, 'not-assessed');
    assert.strictEqual(r.times.pressureMin, null, 'never infer pressure minutes from prose');
    assert.strictEqual(r.yieldCookedG, null, 'no unmeasured yield invention');
    assert.strictEqual(r.flavorTags.length, 0, 'flavor tag inference belongs to P5, not import');
    for (const s of r.steps) assert.strictEqual(typeof s.text.en, 'string');
  }
});

test('quantities are exact canonical strings and units map each→count', () => {
  const out = I.importWeighed(source.curatedRecipes);
  const uses = out.recipes.flatMap((r) => r.ingredients);
  assert.ok(uses.length >= 40, `suspiciously few uses: ${uses.length}`);
  for (const u of uses) {
    assert.match(u.quantity, S.QUANTITY_RE, `non-canonical quantity ${u.quantity} in ${u.ingredientId}`);
    assert.ok(['count', 'g', 'kg', 'ml', 'l'].includes(u.unit));
  }
  const counted = uses.find((u) => u.unit === 'count');
  assert.ok(counted, 'expected at least one count use among 7 recipes');
  assert.strictEqual(counted.basis, 'raw');
});

test('ingredients manifest generated with provisional es-PE name marked honestly', () => {
  const out = I.importWeighed(source.curatedRecipes);
  assert.ok(out.ingredients.length >= 40);
  for (const ing of out.ingredients) {
    const v = S.validateIngredient(ing);
    assert.deepStrictEqual(v.errors.map((e) => e.code), [], JSON.stringify(v.errors));
    assert.strictEqual(ing.nameProvisional, true);
  }
});

test('seeded negatives: non-exact float and unknown basis quarantine the recipe with reasons', () => {
  const badQ = structuredClone(source.curatedRecipes).slice(0, 1).map((r) => ({ ...r, ingredients: [{ ...r.ingredients[0], quantity: 1e-7, weightG: 1e-7 }] }));
  const out = I.importWeighed(badQ);
  assert.strictEqual(out.recipes.length, 0, `should quarantine all: ${JSON.stringify(out.recipes.map((r) => r.id))}`);
  assert.ok(out.report.some((x) => x.level === 'error' && x.code === 'non_exact_quantity'));

  const badBasis = structuredClone(source.curatedRecipes).slice(0, 1).map((r) => ({ ...r, ingredients: [{ ...r.ingredients[0], weightBasis: ' portrays fresh weight of the plated product' }] }));
  const out2 = I.importWeighed(badBasis);
  assert.strictEqual(out2.recipes.length, 0);
  assert.ok(out2.report.some((x) => x.level === 'error' && x.code === 'unknown_basis'));
});

test('bottled liquids ("label dependent") import as raw with a recorded composition warning', () => {
  const out = I.importWeighed(source.curatedRecipes);
  const soy = out.recipes.flatMap((r) => r.ingredients).filter((u) => u.ingredientId === 'soy_sauce');
  assert.strictEqual(soy.length, 2, 'both recipes using soy sauce must import');
  for (const u of soy) assert.strictEqual(u.basis, 'raw');
  assert.ok(out.report.some((x) => x.level === 'warn' && x.code === 'composition_label_dependent'));
  const soyIng = out.ingredients.find((i) => i.id === 'soy_sauce');
  assert.strictEqual(soyIng.dimension, 'ml');
});

test('legacy 29 recipes are quarantined, never RecipeVersions, shopping math locked', () => {
  const q = I.importLegacyQuarantine(source.legacyRecipeAudits);
  assert.strictEqual(q.length, 29, `expected 29 quarantine records, got ${q.length}`);
  for (const rec of q) {
    assert.strictEqual(rec.validationStatus, 'needs_normalization');
    assert.strictEqual(rec.shoppingMathLocked, true);
    assert.ok(rec.issues.length >= 1, `${rec.id} has no recorded issues`);
    assert.strictEqual(rec.ingredients, undefined, 'quarantine records carry NO ingredient fields');
  }
});

test('round-trip: imported output survives JSON serialization and still validates', () => {
  const out = I.importWeighed(source.curatedRecipes);
  const rev = JSON.parse(JSON.stringify(out));
  for (const r of rev.recipes) assert.deepStrictEqual(S.validateRecipeVersion(r).errors, []);
  for (const ing of rev.ingredients) assert.deepStrictEqual(S.validateIngredient(ing).errors, []);
});
