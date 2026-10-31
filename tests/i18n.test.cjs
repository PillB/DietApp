'use strict';
// P6 i18n tests — locale completeness via the exported validator (seeded-negative:
// a stripped key MUST fail), plus a red-team of the safety of slot labels and the
// absence of personal identifiers.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const I = require('../assets/js/i18n.js');

test('every key exists in all six locales with non-empty strings', () => {
  const v = I.validateDict();
  assert.deepStrictEqual(v.missing, [], JSON.stringify(v.missing));
  assert.deepStrictEqual(I.LOCALES, ['en', 'es-PE', 'zh-Hans', 'hi', 'de', 'ja']);
  assert.ok(Object.keys(I.DICT).length >= 20, `dictionary too small: ${Object.keys(I.DICT).length}`);
});

test('seeded negative: stripping one locale string makes validateDict fail (checker is live)', () => {
  const original = 'planner.title';
  const backup = I.DICT[original].hi;
  try {
    delete I.DICT[original].hi;
    const v = I.validateDict();
    assert.deepStrictEqual(v.missing, ['planner.title :: hi'], JSON.stringify(v.missing));
  } finally {
    I.DICT[original].hi = backup;
  }
});

test('slot labels localize per locale (es-PE/native words, not English leakage)', () => {
  assert.strictEqual(I.DICT['slots.almuerzo']['es-PE'], 'almuerzo');
  assert.strictEqual(I.DICT['slots.desayuno']['zh-Hans'], '早餐');
  assert.strictEqual(I.DICT['slots.cena']['de'], 'Abendessen');
});

test('no personal identifiers (do-not-reference rule) inside the dictionary', () => {
  const blob = JSON.stringify(I.DICT);
  for (const bad of ['Pablo', 'Illescas']) assert.ok(!blob.includes(bad), `forbidden identifier in dictionary: ${bad}`);
});

test('setLanguage refuses unknown locales without mutating state', () => {
  const before = I.getLanguage();
  const r = I.setLanguage('klingon');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(I.getLanguage(), before);
});

test('DEFAULT language is es-PE (owner standing directive: Peruvian Spanish first)', () => {
  // fresh module load to see the real default, not whatever a prior test set
  delete require.cache[require.resolve('../assets/js/i18n.js')];
  const fresh = require('../assets/js/i18n.js');
  assert.strictEqual(fresh.getLanguage(), 'es-PE');
});
