'use strict';
// P4.1 — cook-mode extraction/classification tests. Everything the UI knows
// about unstructured steps must arrive labeled: extracted temps are claims
// (unverified), inferred foodTypes carry confidence 'inferred' — nothing
// silently upgrades prose to a measured fact.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const COOK = require('../assets/js/cooking-core.js');

test('temperature claim extraction: °C prose numbers become lab articles (unverified), units only °C/F acceptable', () => {
  const steps = ['Sear the salmon to 63 °C internally.', 'Simmer 10 minutes until the sauce thickens.', 'Roast at 190°C.', 'Warm gently to 100 °F.'];
  const claims = COOK.extractHeatClaims(steps);
  assert.deepStrictEqual(claims[0], { stepIdx: 0, tempC: 63, verified: false, basis: 'extracted-from-prose' });
  assert.strictEqual(claims[1], null, 'no temperature words → no claim invented');
  assert.ok(claims[2] && claims[2].tempC === 190);
  assert.strictEqual(claims[3].tempC, 37.78, 'F converted exactly-by-formula with 2-dp rounding, labeled extracted');
  assert.strictEqual(COOK.extractHeatClaims(['Warm gently to 100 F.'])[3] ?? null, null, 'missing degree symbol → no claim (nothing invented)');
});

test('foodType inference is labeled inferred, conservative by ingredient ids, refuses ambiguous mixes', () => {
  assert.deepStrictEqual(COOK.inferFoodType(['salmon']), { foodType: 'fish', confidence: 'inferred', needs: 'food-safety review' });
  assert.deepStrictEqual(COOK.inferFoodType(['chicken_breast']), { foodType: 'poultry', confidence: 'inferred', needs: 'food-safety review' });
  assert.deepStrictEqual(COOK.inferFoodType(['beef_sirloin']), { foodType: 'whole_cut_beef_pork_lamb', confidence: 'inferred', needs: 'food-safety review' });
  assert.deepStrictEqual(COOK.inferFoodType(['egg', 'spinach']), null, 'no meat heat-risk basis → no inference (null out, not guess)');
  assert.deepStrictEqual(COOK.inferFoodType(['chicken_breast', 'beef_chuck']), null, 'mixed proteins are ambiguous → refuse to pick one class');
});

test('badge logic: pressureGate unvalidated → "generic directions" badge, never pressure-tested claim', () => {
  const badge = COOK.modeBadge({ times: { pressureMin: null }, equipment: ['skillet'] });
  assert.strictEqual(badge.mode, 'generic-modified');
  assert.ok(badge.badgeText.includes('unvalidated'));
  const pressurized = COOK.modeBadge({ times: { pressureMin: 30 }, equipment: ['pressure cooker'] });
  assert.strictEqual(pressurized.mode, 'pressure-unvalidated');
  assert.ok(/not validated/i.test(pressurized.badgeText), JSON.stringify(pressurized));
});

test('step verdict wiring: extracted claims + inferred foodType drive the gate, verdict finite', () => {
  const claims = COOK.extractHeatClaims(['Sear the salmon to 63 °C internally.']);
  const verdict = COOK.stepVerdict(claims[0], COOK.inferFoodType(['salmon']));
  assert.strictEqual(verdict.gate, 'unverified-prose-claim');
  assert.ok(verdict.requires.includes('thermometer'), JSON.stringify(verdict));
  const tooLow = COOK.stepVerdict(COOK.extractHeatClaims(['Warm the chicken to 65 °C.'])[0], COOK.inferFoodType(['chicken_breast']));
  assert.strictEqual(tooLow.gate, 'fails-authoritative-floor');
});
