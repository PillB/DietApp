'use strict';
// P4.1/P4.3 — cook-mode core (pure). Safety constants are the public
// FoodSafety.gov "Safe Minimum Internal Temperature" values and USDA leftover
// guidance; they live in code as cited constants, not as invented claims.
// The Instant Pot gate (P4.2) is structural: unvalidated pressure times stay
// unvalidated — never derived from stovetop minutes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const COOK = require('../assets/js/cooking-core.js');

test('authoritative minimum temps circulate with their citation, no invented numbers', () => {
  assert.strictEqual(COOK.SOURCE, 'FoodSafety.gov Safe Minimum Internal Temperature Chart');
  assert.strictEqual(COOK.getMinTempC('poultry'), 74);
  assert.strictEqual(COOK.getMinTempC('ground_meat'), 71);
  assert.strictEqual(COOK.getMinTempC('whole_cut_beef_pork_lamb'), 63);
  assert.strictEqual(COOK.getMinTempC('fish'), 63);
  assert.strictEqual(COOK.getMinTempC('leftovers_reheat'), 74);
  assert.strictEqual(COOK.getMinTempC('unknown_food'), null, 'unknown food types MUST stay null, not guessed');
});

test('step gate: sub-minimum target temps are refused with the authoritative floor named', () => {
  const step = (foodType, temp) => ({ order: 1, id: 's1', text: { en: 'sear/cook' }, ingredients: [], timeMin: 10, targetTempC: temp, checkpoint: 'thermometer', hazardNotes: [], foodType });
  const r = COOK.validateStepGate(step('poultry', 63));
  const c = r.errors.map((e) => e.code);
  assert.ok(c.includes('temp_below_authoritative_min'), JSON.stringify(r.errors));
  assert.deepStrictEqual(COOK.validateStepGate(step('poultry', 74)).errors, [], 'exact minimum passes');
  assert.deepStrictEqual(COOK.validateStepGate(step('ground_meat', 71)).errors, [], 'ground 71 boundary passes');
  assert.deepStrictEqual(COOK.validateStepGate(step('fish', 63)).errors, [], 'fish 63 passes');
  const restCase = COOK.validateStepGate(step('whole_cut_beef_pork_lamb', 63));
  assert.deepStrictEqual(restCase.errors.map((e) => e.code), ['rest_time_required'], 'whole cut 63 passes temp-wise but a 3-min rest is required');
  assert.deepStrictEqual(COOK.validateStepGate({ ...step('whole_cut_beef_pork_lamb', 63), targetRestMin: 3 }).errors, [], 'full standard passes');
});

test('rest rule: whole-cut 63°C without the 3-minute rest is refused', () => {
  const step = (foodType, temp) => ({ order: 1, id: 's1', text: { en: 'sear/cook' }, ingredients: [], timeMin: 10, targetTempC: temp, checkpoint: 'thermometer', hazardNotes: [], foodType });
  const base = step('whole_cut_beef_pork_lamb', 63);
  const r = COOK.validateStepGate(base);
  assert.ok(r.errors.some((e) => e.code === 'rest_time_required'), JSON.stringify(r.errors));
  assert.deepStrictEqual(COOK.validateStepGate({ ...base, targetRestMin: 3 }).errors, []);
});

test('step gate: thermometer checkpoints REQUIRED for heat-critical protein steps', () => {
  const base = { order: 1, id: 's1', text: { en: 'sear/cook' }, ingredients: [], timeMin: 10, checkpoint: 'sensory-color', hazardNotes: [], foodType: 'poultry' };
  const r = COOK.validateStepGate({ ...base, targetTempC: 74 });
  assert.ok(r.errors.map((e) => e.code).includes('thermometer_required'), 'time/subjective-color checkpoints are not provenance for safety');
  assert.deepStrictEqual(COOK.validateStepGate({ ...base, targetTempC: 74, checkpoint: 'thermometer', targetRestMin: 3 }).errors, []);
});

test('leftover guidance mirrors USDA (3-4 days ≤4°C, reheat to 74°C) and refuses to guarantee health past the window', () => {
  const inWindow = COOK.leftoverAdvice({ cookedOnIso: '2026-10-30', nowIso: '2026-11-02' });
  assert.strictEqual(inWindow.status, 'within-usda-window');
  assert.ok(inWindow.text.includes('3-4 days'));
  assert.ok(inWindow.text.includes('74°C'));
  const pastWindow = COOK.leftoverAdvice({ cookedOnIso: '2026-10-22', nowIso: '2026-11-02' });
  assert.strictEqual(pastWindow.status, 'beyond-usda-guideline-window');
  assert.ok(/discard/gi.test(pastWindow.text) || /do not/i.test(pastWindow.text));
  const misuse = COOK.leftoverAdvice({ cookedOnIso: '2026-11-11', nowIso: '2026-11-02' }); // cooked in the future = data error
  assert.strictEqual(misuse.status, 'invalid_dates');
});

test('P4.2 Instant Pot gate: pressure times WITHOUT validation never become "tested"', () => {
  const timing = { activeMin: 10, passiveMin: 5, pressureMin: 30, releaseMin: 10 };
  const equip = ['pressure cooker'];
  const unvalidated = COOK.pressureGate({ times: timing, equipment: equip }, null);
  assert.strictEqual(unvalidated.pressureValidated, false);
  assert.ok(unvalidated.blockers.includes('pressure_time_not_validated'), JSON.stringify(unvalidated));
  const wrongSource = COOK.pressureGate({ times: timing, equipment: equip }, { sourceEvidenceId: 'e-x', sourceType: 'generated_report' });
  assert.strictEqual(wrongSource.pressureValidated, false, 'generated reports are NOT kitchen/validation provenance');
  // Full provenance record: not just "experiment happened" — the P4.2 checklist
  // fields must be affirmed (min liquid, fill line, release model), plus evidence id.
  const validated = COOK.pressureGate({ times: timing, equipment: equip }, { sourceEvidenceId: 'e-k1', sourceType: 'kitchen_experiment', pressureHasMinLiquid: true, fillLineChecked: true, releaseModelSpecified: true });
  assert.strictEqual(validated.pressureValidated, true);
  const noEquipment = COOK.pressureGate({ times: { ...timing }, equipment: ['skillet'] }, { sourceEvidenceId: 'e-k1', sourceType: 'kitchen_experiment', pressureHasMinLiquid: true, fillLineChecked: true, releaseModelSpecified: true });
  assert.strictEqual(noEquipment.pressureValidated, false);
});
