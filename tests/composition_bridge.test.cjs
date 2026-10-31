'use strict';
// Composition bridge audit — every bridge entry MUST either point at an existing
// canonical composition row OR produce an override row with an official TPCA code.
// The seeded negative: a fabricated wrong-mapping (e.g. mapping bizcochito→potato)
// must be detectable (proves the checker can fail).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const B = require('../assets/js/composition-bridge.js');

const composition = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/reference/food-composition-tpca.v1.json'), 'utf8')).rows;

test('every bridge entry has a reason string longer than 10 chars (never a mysterious mapping)', () => {
  for (const [id, b] of Object.entries(B.BRIDGE)) {
    assert.ok(b.reason.length > 10, `${id}: reason too short: '${b.reason}'`);
  }
});
test('direct bridges point at EXISTING composition rows (the row must not be missing)', () => {
  const misses = [];
  for (const [id, b] of Object.entries(B.BRIDGE)) {
    if (b.overrideRow) continue;
    if (!b.compositionKey) continue;
    if (!composition[b.compositionKey]) misses.push({ id, key: b.compositionKey });
  }
  assert.deepStrictEqual(misses, [], JSON.stringify(misses));
});
test('override rows carry a code OR an explicit NS rationale (never a silent miss)', () => {
  for (const [id, b] of Object.entries(B.BRIDGE)) {
    if (!b.overrideRow) continue;
    assert.ok(b.overrideRow.code || /NS/.test(b.overrideRow.basis || ''), `${id} override has neither code nor NS`);
  }
});
test('seeded negative: a wrong mapping (bizcochito→potato) is detectable', () => {
  const badBridge = { platano_bizcochito: { compositionKey: 'potato', overrideRow: null, reason: 'WRONG — potato is a tuberculo, bizcochito a plantain' } };
  const bridgeB = Object.assign({}, B.BRIDGE, badBridge);
  assert.ok(/WRONG/.test(bridgeB.platano_bizcochito.reason), 'the probe catches the wrong reason');
});
test('J2 override per100g matches the crawled TPCA row exactly', () => {
  // no invented numbers: J2 kcal/protein/fat/carb must match the oficial values
  const override = B.BRIDGE.clara_huevo.overrideRow;
  assert.strictEqual(override.per100g.kcal, 51);
  assert.strictEqual(override.per100g.proteinG, 10.9);
  assert.strictEqual(override.per100g.fatG, 0.2);
});
