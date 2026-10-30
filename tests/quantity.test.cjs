'use strict';
// P1.3 tests — exact rational engine. The centerpiece negative proof: naive float
// arithmetic on 1/3 fails the ⅓+⅓+⅓ === 1 test; our rationals must not.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../assets/js/quantity.js');

test('⅓ + ⅓ + ⅓ is exactly 1 (engine exactness)', () => {
  const third = Q.parseExact('⅓');
  const one = Q.add(Q.add(third, third), third);
  assert.deepStrictEqual(one, { num: 1, den: 1 });
  // documented IEEE-754 drift (Knuth/Floats standard exhibit): float baseline of
  // decimal inputs drifts — the rational engine never does
  assert.notStrictEqual(0.1 + 0.2, 0.3);
  assert.ok(Q.eq(Q.add(Q.parseExact('0.1'), Q.parseExact('0.2')), Q.parseExact('0.3')), 'rationals remain exact where floats drift');
});

test('parse forms: fractions, mixed numbers, decimals, vulgar glyphs; canonical equality', () => {
  assert.deepStrictEqual(Q.parseExact('1/2'), { num: 1, den: 2 });
  assert.ok(Q.eq(Q.parseExact('0.5'), Q.parseExact('1/2')));
  assert.ok(Q.eq(Q.parseExact('2 1/2'), { num: 5, den: 2 }));
  assert.ok(Q.eq(Q.parseExact('½'), Q.parseExact('1/2')));
  assert.ok(Q.eq(Q.parseExact('300'), { num: 300, den: 1 }));
  assert.strictEqual(Q.toNumber(Q.parseExact('0.75')), 0.75);
});

test('rejects banned/lossy inputs instead of parseFloat-style rescue', () => {
  for (const bad of ['1/2.5', '1e-7', '', 'abc', '-2', '2.5.1', NaN, Infinity, 0.1 + 0.2]) {
    assert.throws(() => Q.parseExact(bad), undefined, `should reject ${JSON.stringify(bad)}`);
  }
});

test('same-family conversions are definitional: kg→g, l→ml, kg→kg identity', () => {
  const kgHalf = Q.parseExact('0.5');
  const g = Q.convert(kgHalf, 'kg', 'g');
  assert.ok(Q.eq(g.quantity, Q.parseExact('500')));
  assert.strictEqual(g.provenance, 'canonical-definition');
  const liters = Q.parseExact('1.5');
  const ml = Q.convert(liters, 'l', 'ml');
  assert.ok(Q.eq(ml.quantity, Q.parseExact('1500')));
  const same = Q.convert(Q.parseExact('3'), 'count', 'count');
  assert.strictEqual(same.provenance, 'identity');
});

test('cross-dimension conversion is refused without a sourced factor (P1.4 gate)', () => {
  assert.throws(() => Q.convert(Q.parseExact('200'), 'g', 'ml'), (e) => e.code === 'cross_dimension_no_sourced_factor');
  const water = Q.convert(Q.parseExact('200'), 'g', 'ml', { factor: '1', sourceEvidenceId: 'e-water-1g-per-ml' });
  assert.ok(Q.eq(water.quantity, Q.parseExact('200')), '1 g/ml yields same value when sourced');
  // missing evidence id is still refused (value alone is not provenance)
  assert.throws(() => Q.convert(Q.parseExact('200'), 'g', 'ml', { factor: '1' }), (e) => e.code === 'cross_dimension_no_sourced_factor');
});

test('shopping aggregation sum: 1/2 + 2 count = 2.5 count in ONE line, not two', () => {
  const totals = Q.sumPerIngredient([
    { ingredientId: 'red_onion', quantity: '1/2', unit: 'count' },
    { ingredientId: 'red_onion', quantity: '2', unit: 'count' },
  ]);
  const lines = totals.get('red_onion');
  assert.strictEqual(lines.length, 1);
  assert.strictEqual(lines[0].unit, 'count');
  assert.ok(Q.eq(lines[0].quantity, Q.parseExact('2.5')));
  // halves of kg and g NEVER merge (different family presentation)
  const mixed = Q.sumPerIngredient([
    { ingredientId: 'rice', quantity: '500', unit: 'g' },
    { ingredientId: 'rice', quantity: '0.75', unit: 'kg' },
  ]);
  assert.strictEqual(mixed.get('rice').length, 2, 'kg/g stay separate until convert() is applied');
});

test('kg and g merge after explicit same-family conversion (500g + 0.75kg = 1250g)', () => {
  const [gLine, kgLine] = Q.sumPerIngredient([
    { ingredientId: 'rice', quantity: '500', unit: 'g' },
    { ingredientId: 'rice', quantity: '0.75', unit: 'kg' },
  ]).get('rice');
  const conv = Q.convert(kgLine.quantity, 'kg', 'g');
  const total = Q.add(gLine.quantity, conv.quantity);
  assert.ok(Q.eq(total, Q.parseExact('1250')), `expected 1250g, got ${Q.toNumber(total)}`);
});

test('overflow guard: absurd denominators throw instead of losing precision', () => {
  const big = { num: Number.MAX_SAFE_INTEGER, den: 1 };
  assert.throws(() => Q.add(big, big), (e) => e.code === 'q_overflow');
});
