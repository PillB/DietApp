'use strict';
// W5b PR-1 — step-text adapter invariants (LEDGER-D58).
// The alignment invariant blocks the silent misalignment class: if an es-PE
// translation array drifts in length from its EN counterpart, an index-parallel
// render pairs the wrong es text with the wrong EN step — this test makes that
// state IMPOSSIBLE to merge.
// Seeded-negative included (a corrupted translations length flips RED).
const { test } = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../assets/js/nutrition-data.js');
const ND = window.GOURMET_NUTRITION_DATA;
const fs = require('node:fs');
const path = require('node:path');

const StepText = require('../assets/js/step-text.js');
const translations = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/reference/step-translations-espe.v1.json'), 'utf8')).translations;
const docx = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/canonical/docx-diet-recipes-canon.v1.json'), 'utf8'));
const mealPlan = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../meal-plan-data.json'), 'utf8'));

test('invariant: every curated-7 es-PE translation array has EXACTLY the EN step count', () => {
  for (const recipe of ND.curatedRecipes) {
    const tx = translations[recipe.id];
    if (!tx) {
      // absence is allowed (esStatus degrades to 'none') — but a PARTIAL array is not
      continue;
    }
    assert.strictEqual(
      tx.length, recipe.steps.length,
      `${recipe.id}: es translations=${tx.length} vs en steps=${recipe.steps.length} — index-parallel rendering would mispair`,
    );
  }
});

test('adapter: curated-7 family detects + emits the canonical shape with draft es (all lines aligned)', () => {
  for (const recipe of ND.curatedRecipes) {
    const steps = StepText.stepTextsOf(recipe, { translations });
    assert.strictEqual(steps.length, recipe.steps.length, recipe.id);
    for (const [i, s] of steps.entries()) {
      assert.strictEqual(s.text.en, recipe.steps[i], `${recipe.id}#${i}: EN authority must be verbatim`);
      assert.ok(s.text.esPE, `${recipe.id}#${i}: translation present in the served reference file`);
      assert.strictEqual(s.text.esStatus, 'draft');
      // the '[es-PE borrador]' marker itself is composed by the RENDER layer
      // (cook-mode-ui renderSteps), keeping the tag policy in one place
      assert.ok(!s.text.esPE.includes('[es-PE borrador]'), `${recipe.id}#${i}: adapter must not bake the display tag into data`);
    }
  }
});

test('adapter: docx-4 family passes through the rich struct with authored-es status', () => {
  for (const r of docx.recipes) {
    // production shape: shopping-ui init maps {...meta, steps, sourceFamily:'owner-docx'}
    const asModel = { ...r.meta, steps: r.steps, sourceFamily: 'owner-docx' };
    const steps = StepText.stepTextsOf(asModel, { translations });
    assert.strictEqual(steps.length, r.steps.length, r.meta.id);
    for (const [i, s] of steps.entries()) {
      assert.strictEqual(s.text.en, r.steps[i].text.en, `${r.meta.id}#${i}`);
      assert.strictEqual(s.id, r.steps[i].id);
      // the docx canon authors es at the STEP level (s.esPE), not inside text:{}
      assert.ok(r.steps[i].esPE, `${r.meta.id}#${i}: canon must carry authored es (locus regression guard)`);
      assert.strictEqual(s.text.esStatus, 'authored-es');
      assert.strictEqual(s.text.esPE, r.steps[i].esPE);
    }
  }
});

test('adapter: legacy-29 family yields esStatus none and preserves prose verbatim', () => {
  const legacy = mealPlan.recipes.find((r) => r.id === 'artichoke-benedict-with-roasted-trout');
  const steps = StepText.stepTextsOf(legacy, { translations });
  assert.strictEqual(steps.length, legacy.method.length);
  for (const s of steps) {
    assert.strictEqual(s.text.esStatus, 'none');
    assert.ok(!s.text.esPE);
  }
});

test('seeded-negative: a corrupted translations array (one entry dropped) flips the adapter alignment RED', () => {
  const recipe = ND.curatedRecipes[0];
  const corrupted = { ...translations, [recipe.id]: translations[recipe.id].slice(0, -1) };
  const steps = StepText.stepTextsOf(recipe, { translations: corrupted });
  const draftCount = steps.filter((s) => s.text.esStatus === 'draft').length;
  assert.strictEqual(
    draftCount, recipe.steps.length - 1,
    'harness must detect the dropped translation: the last step degrades to esStatus none',
  );
});
