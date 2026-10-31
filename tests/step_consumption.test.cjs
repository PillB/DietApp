'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/js/step-consumption-core.js');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/canonical/docx-diet-recipes-canon.v1.json'), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));

test('all four canonical recipes have exact planned allocations without missing or surplus quantities', () => {
  assert.equal(source.recipes.length, 4);
  let allocations = 0;
  for (const recipe of source.recipes) {
    const report = core.auditRecipe(recipe);
    assert.equal(report.ok, true, recipe.meta.id + ': ' + JSON.stringify(report.errors));
    assert.equal(report.status, 'planned-allocation-only-not-kitchen-verified');
    allocations += recipe.steps.reduce((sum, step) => sum + step.ingredientUses.length, 0);
  }
  assert.equal(allocations, 22);
});

test('negative control: overconsumption is detected rather than clamped to zero', () => {
  const recipe = clone(source.recipes[0]);
  recipe.steps[0].ingredientUses[0].quantity = '900';
  const report = core.auditRecipe(recipe);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(e => e.code === 'overconsumption'));
});

test('negative control: missing quantified use does not count as consumption', () => {
  const recipe = clone(source.recipes[0]);
  recipe.steps[0].ingredientUses = [];
  const report = core.auditRecipe(recipe);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(e => e.code === 'unallocated_ingredient'));
});

test('negative control: wrong units and raw/dry states do not silently merge', () => {
  for (const field of ['unit', 'basis']) {
    const recipe = clone(source.recipes[0]);
    recipe.steps[0].ingredientUses[1][field] = field === 'unit' ? 'ml' : 'cooked';
    const report = core.auditRecipe(recipe);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some(e => e.code === 'unknown_or_mismatched_unit_basis'));
  }
});

test('source integrity: plantain cannot inherit cooked beans nutrition', () => {
  const plantain = source.ingredients.find(i => i.id === 'platano_bizcochito');
  assert.equal(plantain.foodCompositionRef, null);
  assert.equal(plantain.compositionStatus, 'unmatched_variety_requires_reference');
});

test('heat-critical fish processing references the same canonical protein', () => {
  const fish = source.recipes.find(r => r.meta.id === 'pescado_ajonjoli_diet');
  const heated = fish.steps.find(s => s.targetTempC !== null);
  assert.ok(heated && heated.processRefs.includes('filete_pescado_blanco'));
  assert.ok(fish.ingredients.some(i => i.ingredientId === 'filete_pescado_blanco'));
});
