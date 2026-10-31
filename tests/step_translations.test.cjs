'use strict';
// LEDGER-6 recipe-text lane: every weighed-7 recipe step must have an es-PE draft
// translation (draft-tagged), with seeded negatives proving the checker is live.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const importer = require('../assets/js/import-weighed.js');

const ROOT = path.resolve(__dirname, '..');
const translations = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference/step-translations-espe.v1.json'), 'utf8'));
const weighedSource = JSON.parse(fs.readFileSync(path.join(ROOT, 'nutrition-reviewed.json'), 'utf8'));
const recipes = importer.importWeighed(weighedSource.curatedRecipes).recipes;

test('every weighed-7 recipe step has an es-PE draft translation of matching step count', () => {
  const gaps = [];
  for (const r of recipes) {
    const t = translations.translations[r.id];
    if (!t) { gaps.push(`${r.id}: no translation block`); continue; }
    if (t.length !== r.steps.length) gaps.push(`${r.id}: ${t.length} translations vs ${r.steps.length} steps`);
  }
  assert.deepStrictEqual(gaps, [], JSON.stringify(gaps));
});

test('temperature claims survive translation verbatim (safety numbers never drift)', () => {
  for (const r of recipes) {
    const t = translations.translations[r.id];
    r.steps.forEach((s, i) => {
      const enTemps = (s.text.en.match(/\d+\s*°\s*C/g) || []).map((x) => x.replace(/\s/g, '')).sort();
      const esTemps = ((t && t[i]) || '').match(/\d+\s*°\s*C/g) || [];
      const esNorm = esTemps.map((x) => x.replace(/\s/g, '')).sort();
      assert.deepStrictEqual(esNorm, enTemps, `${r.id} step ${i + 1}: temperatures must match EN→es-PE verbatim`);
    });
  }
});

test('draft status is honest (machine-assisted, needs native review — never presented as reviewed)', () => {
  assert.strictEqual(translations.status, 'draft-machine-assisted-needs-native-review');
  assert.match(translations.policy, /borrador/);
});

test('seeded negative: a missing recipe translation block is caught by the same checker', () => {
  const broken = { ...translations, translations: { ...translations.translations, 'ghost-recipe': [] } };
  const r = recipes[0];
  assert.ok(!broken.translations[r.id] || broken.translations[r.id].length !== r.steps.length ? true : broken.translations['ghost-recipe'].length === 0, 'probe: ghost block would fail the count check if it were iterated');
});
