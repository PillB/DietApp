'use strict';
// P1.3 — exact rational quantities & unit families (NO float arithmetic on values).
// Lab-grade requirement from docs/DATA_CONTRACT.md: 1/3 + 1/3 + 1/3 must EXACTLY
// equal 1 (compare: parse-free floats give 1.0000000000000002 with naive parsing).
// Canonical units: count; g/kg (mass); ml/l (volume). Cross-dimension conversion is
// refused unless an explicit sourced factor record is provided (value + evidence id).
// Browser (window.Quantity) and Node (module.exports).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Quantity = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const VULGAR = { '⅛': [1, 8], '¼': [1, 4], '⅓': [1, 3], '⅖': [2, 5], '½': [1, 2], '⅗': [3, 5], '⅝': [5, 8], '⅔': [2, 3], '¾': [3, 4], '⅘': [4, 5], '⅙': [1, 6], '⅚': [5, 6], '⅐': [1, 7], '⅑': [1, 9], '⅒': [1, 10], '⅕': [1, 5], '⅞': [7, 8] };
  // builtin same-dimension unit families; conversions are definitional constants
  const FAMILIES = {
    mass: { units: { g: 1, kg: 1000 } },
    volume: { units: { ml: 1, l: 1000 } },
    count: { units: { count: 1 } },
  };

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  function makeQ(num, den) {
    if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || den === 0) {
      throw Object.assign(new Error('quantity out of safe integer range'), { code: 'q_overflow' });
    }
    if (num === 0) return { num: 0, den: 1 };
    const sign = den < 0 ? -1 : 1;
    const g = Math.abs(gcd(num, den));
    return { num: sign * num / g, den: sign * den / g };
  }

  const add = (a, b) => makeQ(a.num * b.den + b.num * a.den, a.den * b.den);
  const sub = (a, b) => makeQ(a.num * b.den - b.num * a.den, a.den * b.den);
  const mul = (a, b) => makeQ(a.num * b.num, a.den * b.den);
  const eq = (a, b) => a.num * b.den === b.num * a.den; // value equality via cross-multiply (representation-independent)
  const gt = (a, b) => a.num * b.den > b.num * a.den;
  const isZero = (a) => a.num === 0;
  /** UI/display only — never used in intermediate arithmetic. */
  const toNumber = (a) => a.num / a.den;

  function parseExact(input) {
    let s = String(input).trim();
    if (s === '') throw Object.assign(new Error('empty quantity'), { code: 'q_empty' });
    // vulgar-fraction replacement, then trim again (replacement can add leading space)
    for (const [glyph, [n, d]] of Object.entries(VULGAR)) s = s.split(glyph).join(` ${n}/${d}`).trim();
    const mixed = s.match(/^(\d+) (\d+)\/(\d+)$/);
    if (mixed) {
      return add(makeQ(Number(mixed[1]), 1), makeQ(Number(mixed[2]), Number(mixed[3])));
    }
    const frac = s.match(/^(\d+)\/(\d+)$/);
    if (frac) return makeQ(Number(frac[1]), Number(frac[2]));
    if (/^\d+$/.test(s)) return makeQ(Number(s), 1);
    if (/^\d+\.\d+$/.test(s)) {
      const [whole, part] = s.split('.');
      // decimal as exact rational: 0.5 → 5/10 (string digits, no float division)
      return makeQ(Number(whole + part), 10 ** part.length);
    }
    throw Object.assign(new Error(`not a supported exact nonnegative quantity: ${input}`), { code: 'q_unsupported' });
  }

  function family(unit) {
    for (const [name, f] of Object.entries(FAMILIES)) if (unit in f.units) return { name, factor: f.units[unit]};
    return null;
  }

  function convert(q, fromUnit, toUnit, sourcedFactor) {
    const fx = { from: family(fromUnit), to: family(toUnit) };
    if (fromUnit === toUnit) return { quantity: q, unit: toUnit, provenance: 'identity' };
    if (fx.from && fx.to && fx.from.name === fx.to.name) {
      // ratio between units inside a family is definitional: q_kg→g = q × 1000/1
      return { quantity: mul(q, makeQ(fx.from.factor, fx.to.factor)), unit: toUnit, provenance: 'canonical-definition' };
    }
    if (sourcedFactor && sourcedFactor.factor && sourcedFactor.sourceEvidenceId) {
      return { quantity: mul(q, parsedFactor(sourcedFactor)), unit: toUnit, provenance: sourcedFactor.sourceEvidenceId };
    }
    throw Object.assign(new Error(`cross-dimension conversion ${fromUnit}→${toUnit} requires an explicitly sourced density/yield factor`), { code: 'cross_dimension_no_sourced_factor' });
  }

  const parsedFactor = (sf) => (typeof sf.factor === 'string' ? parseExact(sf.factor) : sf.factor);

  /** Aggregate uses grouped by (ingredient, unit); refuses merged unit families.
   * uses: [{ingredientId, quantity, unit}] → Map ingredientId → [{quantity, unit}] */
  function sumPerIngredient(uses) {
    const totals = new Map();
    for (const u of uses) {
      const key = u.ingredientId;
      const q = typeof u.quantity === 'string' ? parseExact(u.quantity) : u.quantity;
      const list = totals.get(key) || [];
      const same = list.find((t) => t.unit === u.unit);
      if (same) same.quantity = add(same.quantity, q);
      else list.push({ quantity: q, unit: u.unit });
      totals.set(key, list);
    }
    return totals;
  }

  return { parseExact, add, sub, mul, eq, gt, isZero, toNumber, convert, sumPerIngredient, FAMILIES };
});
