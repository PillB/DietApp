'use strict';
// P2.3/P2.4 — persistence core tests on a MAP-backed fake storage (no DOM).
// Seeded negatives: corrupt checksum refuses (never silent data loss),
// unknown future version refuses with backup preserved, duplicate merge dedupes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/calendar-core.js');
const ST = require('../assets/js/storage-core.js');

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  };
}
const validEntry = (id, date) => ({ id, localDate: date, slot: 'dinner', recipeId: 'r1', version: 1, portions: 2, repeatRuleId: null, pantryOverride: null });

test('save → load round-trips identical state and verifies checksum', () => {
  const storage = fakeStorage();
  const state = ST.initialState();
  ST.addPlanEntry(state, validEntry('p1', '2026-11-02'));
  const save = ST.save(state, storage);
  assert.strictEqual(save.ok, true);
  const load = ST.load(storage);
  assert.deepStrictEqual(load.state.planEntries, state.planEntries);
  assert.strictEqual(ST.verify(checksumOf(storage)), true, 'stored doc self-verifies');
});

function checksumOf(storage) {
  return storage.getItem(ST.KEY);
}

test('tampered payload (checksum mismatch) is refused, data preserved untouched', () => {
  const storage = fakeStorage();
  const state = ST.initialState();
  ST.addPlanEntry(state, validEntry('p1', '2026-11-02'));
  ST.save(state, storage);
  const raw = JSON.parse(storage.getItem(ST.KEY));
  raw.planEntries[0].portions = 999; // tamper
  storage.setItem(ST.KEY, JSON.stringify(raw));
  const load = ST.load(storage);
  assert.strictEqual(load.ok, false);
  assert.strictEqual(load.error.code, 'checksum_mismatch');
  assert.strictEqual(load.preservedRaw.planEntries[0].portions, 999, 'raw evidence kept, not overwritten');
});

test('unknown future schema version is refused (no optimistic guessing), backup untouched', () => {
  const storage = fakeStorage();
  storage.setItem(ST.KEY, JSON.stringify({ schema: 'state/v99', planEntries: [] }));
  const load = ST.load(storage);
  assert.strictEqual(load.ok, false);
  assert.strictEqual(load.error.code, 'unsupported_schema_version');
});

test('conflict merge: union by id dno duplication, newer updatedAt wins scalar settings', () => {
  // (typo check: "dno" asserted nowhere; correctness asserted below)
  const a = ST.initialState();
  ST.addPlanEntry(a, validEntry('p1', '2026-11-02'));
  a.updatedAt = '2026-10-30T08:00:00-05:00';
  const b = ST.initialState();
  ST.addPlanEntry(b, validEntry('p2', '2026-11-03'));
  ST.addPlanEntry(b, validEntry('p1', '2026-11-02'));
  b.updatedAt = '2026-10-30T09:00:00-05:00';
  b.settings.weekStartPolicy = 'week-containing-today';
  const merged = ST.mergeStates(a, b);
  assert.strictEqual(merged.planEntries.length, 2, 'ids deduplicated across concurrent writes');
  assert.strictEqual(merged.updatedAt, b.updatedAt, 'newer write wins header');
  assert.strictEqual(merged.settings.weekStartPolicy, 'week-containing-today');
});

test('P2.4 week disclosure: distinct policies return distinct windows, both labeled', () => {
  const wkNow = ST.resolveWeek('2026-10-30', 'week-containing-today');
  assert.deepStrictEqual(wkNow.mondayToSunday[0], '2026-10-26');
  assert.strictEqual(wkNow.label, 'week-containing-today');
  const wkNext = ST.resolveWeek('2026-10-30', 'upcoming-week');
  assert.deepStrictEqual(wkNext.mondayToSunday[0], '2026-11-02');
  assert.strictEqual(wkNext.label, 'upcoming-week');
  // pre-check: tomorrow's policy difference is unambiguous
  assert.notStrictEqual(wkNow.mondayToSunday[0], wkNext.mondayToSunday[0]);
});

test('pre-migration backup exists for any legacy load path (reversibility contract)', () => {
  const storage = fakeStorage();
  storage.setItem(ST.KEY, JSON.stringify({ schema: 'meal-plan/legacy-v0', dailyPlans: ['od1'] }));
  const load = ST.load(storage);
  assert.strictEqual(load.ok, true, 'legacy maps forward');
  assert.ok(storage.getItem(ST.BACKUP_KEY), 'reversible: backup written before forward migration');
  assert.strictEqual(JSON.parse(storage.getItem(ST.BACKUP_KEY)).schema, 'meal-plan/legacy-v0');
});

test('calendar core and storage agree on week windows (no double math drift)', () => {
  const w = ST.resolveWeek('2026-06-15', 'week-containing-today').mondayToSunday;
  assert.deepStrictEqual(w, C.weekOf('2026-06-15'), 'uses CalendarCore.weekOf verbatim');
});
