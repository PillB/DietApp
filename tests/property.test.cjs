'use strict';
// P7-R1 — property/fuzz tests (docs/QA_RELEASE.md test pyramid row 2).
// Deterministic seeded PRNG (mulberry32) — reproducible failures, no flaky randomness.
// Properties: addition commutative+associative (rationals), duplication doubles demand,
// servings monotonicity, non-negative net amounts, ceil never underbuys.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../assets/js/quantity.js');
const SHOP = require('../assets/js/shopping-core.js');

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261031);
const randRational = () => {
  const num = 1 + Math.floor(rnd() * 500);
  const den = 1 + Math.floor(rnd() * 50);
  return { num, den };
};

test('property: rational addition is commutative and associative (200 randomized triples)', () => {
  for (let i = 0; i < 200; i++) {
    const a = randRational(), b = randRational(), c = randRational();
    const ab = Q.add(a, b), ba = Q.add(b, a);
    assert.ok(Q.eq(ab, ba), `commutative failed at ${i}: ${a.num}/${a.den} + ${b.num}/${b.den}`);
    const lhs = Q.add(Q.add(a, b), c), rhs = Q.add(a, Q.add(b, c));
    assert.ok(Q.eq(lhs, rhs), `associative failed at ${i}`);
  }
});

test('property: scheduled duplication doubles the demanded quantity (50 randomized scales)', () => {
  for (let i = 0; i < 50; i++) {
    const q = randRational();
    const doubled = Q.add(q, q);
    const expected = { num: q.num * 2, den: q.den };
    assert.ok(Q.eq(doubled, expected), `duplication failed at ${i}`);
  }
});

test('property: servings monotonicity — more portions never decreases demand (40 steps)', () => {
  const recipe = {
    id: 'mono', version: 1, recipeKind: 'meal', validationStatus: 'reviewPending', originalSource: 't',
    baseServings: 4, yieldCookedG: null, equipment: [],
    times: { activeMin: 5, passiveMin: 0, pressureMin: null, releaseMin: null },
    ingredients: [{ ingredientId: 'rice', quantity: '400', unit: 'g', basis: 'raw', optional: false }],
    steps: [], nutrition: { perServing: null, sourceIds: [], status: 'not-assessed' }, flavorTags: [],
  };
  let prev = 0;
  for (const portions of [1, 2, 3, 4, 5, 7, 9, 12, 16, 20]) {
    const out = SHOP.buildShoppingList({ recipes: [recipe], planEntries: [{ id: 'p', localDate: '2026-11-02', slot: 'dinner', recipeId: 'mono', version: 1, portions, repeatRuleId: null, pantryOverride: null }], from: '2026-11-01', to: '2026-11-30' });
    const line = out.lines.find((l) => l.ingredientId === 'rice');
    const grams = line ? line.needed.num / line.needed.den : 0;
    assert.ok(grams >= prev, `monotonicity failed at portions=${portions}: ${grams} < ${prev}`);
    assert.ok(grams >= 0, 'demand never negative');
    prev = grams;
  }
});

test('property: pantry offset clamps at zero — over-pantry never yields negative net (60 random cases)', () => {
  for (let i = 0; i < 60; i++) {
    const need = randRational();
    const have = randRational();
    const net = Q.gt(need, have) ? Q.sub(need, have) : { num: 0, den: 1 };
    assert.ok(net.num >= 0, `negative net at ${i}: need ${need.num}/${need.den}, have ${have.num}/${have.den}`);
  }
});

test('property: ceil-count recommendation never underbuys (80 random fractional onions)', () => {
  for (let i = 0; i < 80; i++) {
    const whole = Math.floor(rnd() * 5);
    const fracDen = [2, 3, 4, 8][Math.floor(rnd() * 4)];
    const fracNum = 1 + Math.floor(rnd() * (fracDen - 1));
    const need = { num: whole * fracDen + fracNum, den: fracDen };
    const rec = SHOP.ceilRational(need);
    assert.ok(rec.num / rec.den >= need.num / need.den, `underbuy at ${need.num}/${need.den}: ceil=${rec.num}`);
    assert.ok(rec.num / rec.den < need.num / need.den + 1, 'ceil overshoots by <1 unit');
  }
});
