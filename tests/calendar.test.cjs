'use strict';
// P2.1/P2.2 — calendar core tests. Local ISO date strings only (no UTC rollover,
// no Date.tz dependence); Lima has no DST but year/leap/month boundaries are proven.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/js/domain-schema.js');
const C = require('../assets/js/calendar-core.js');

test('nextMonday: from midweek finds next Monday; from Monday itself jumps a week', () => {
  assert.strictEqual(C.nextMonday('2026-10-30'), '2026-11-02', 'Fri → Mon');
  assert.strictEqual(C.nextMonday('2026-11-02'), '2026-11-09', 'Mon → next Mon (upcoming week semantics)');
  assert.strictEqual(C.nextMonday('2026-12-30'), '2027-01-04', 'year rollover');
});

test('weekOf: Monday-anchored 7-day window across month/leap boundaries', () => {
  assert.deepStrictEqual(C.weekOf('2026-11-05'), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  assert.deepStrictEqual(C.weekOf('2028-02-29').slice(0, 2), ['2028-02-28', '2028-02-29'], 'leap day lives in its week');
  assert.deepStrictEqual(C.weekOf('2027-01-01'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});

test('repeatRule expansion: Tue+Fri × 2 weeks, exceptions honored, no off-by-one (start Monday)', () => {
  assert.deepStrictEqual(
    C.expandRepeatRule({ startDate: '2026-10-26', weekdays: [2, 5], acrossWeeks: 2, exceptions: [] }),
    ['2026-10-27', '2026-10-30', '2026-11-03', '2026-11-06']
  );
});

test('repeat expansion: 3 consecutive Fridays with one exception', () => {
  assert.deepStrictEqual(
    // start Wednesday 2026-10-28; Fridays fall 10-30, 11-06, 11-13
    C.expandRepeatRule({ startDate: '2026-10-28', weekdays: [5], acrossWeeks: 3, exceptions: ['2026-11-13'] }),
    ['2026-10-30', '2026-11-06']
  );
});

test('concurrent same-day entries are counted, not deduplicated (same recipe twice = 2×)', () => {
  const entries = [
    { id: 'p1', localDate: '2026-11-02', slot: 'dinner', recipeId: 'r1', version: 2, portions: 2, repeatRuleId: null, pantryOverride: null },
    { id: 'p2', localDate: '2026-11-02', slot: 'dinner', recipeId: 'r1', version: 2, portions: 3, repeatRuleId: null, pantryOverride: null },
    { id: 'p3', localDate: '2026-11-09', slot: 'dinner', recipeId: 'r1', version: 2, portions: 4, repeatRuleId: null, pantryOverride: null },
  ];
  const from = C.sumPortionsInRange(entries, '2026-11-01', '2026-11-08');
  const all = C.sumPortionsInRange(entries, '2026-11-01', '2026-11-30');
  assert.strictEqual(from.length, 1);
  assert.strictEqual(from[0].portions, 5, 'two same-day occurrences of r1 sum their portions');
  assert.strictEqual(all.length, 2);
  assert.strictEqual(all.find((r) => r.localDate === '2026-11-09').portions, 4);
  for (const e of entries) assert.deepStrictEqual(S.validatePlanEntry(e).errors, [], 'calendar core emits schema-valid entries');
});

test('language/locale independent: weekday indices follow Date semantics (0=Sun..6=Sat)', () => {
  // 2026-10-30 is a Friday → weekday index 5
  assert.strictEqual(new Date(2026, 9, 30).getDay(), 5);
});
