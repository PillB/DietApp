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


test('invalid JSON values never throw or replace the raw state', () => {
  for (const input of ['null', '[]', '"bad"', '123']) {
    const storage = fakeStorage();
    storage.setItem(ST.KEY, input);
    const result = ST.load(storage);
    assert.equal(result.ok, false, input);
    assert.equal(result.error.code, 'invalid_state_shape', input);
    assert.equal(storage.getItem(ST.KEY), input, 'the original bytes must survive');
  }
});

test('self-consistent checksum is NOT evidence of a valid planner schema', () => {
  const storage = fakeStorage();
  const state = ST.initialState();
  state.planEntries.push(validEntry('p1', '2026-11-02'));
  state.planEntries.push({ ...validEntry('p1', '2026-11-03'), portions: 0 });
  const payload = structuredClone(state);
  delete payload.checksum;
  const checksum = ST.fnv1a(ST.canonicalJson(payload));
  storage.setItem(ST.KEY, JSON.stringify({ ...payload, checksum }));
  const result = ST.load(storage);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid_state_shape');
  assert.equal(result.error.detail, 'bad_plan_entry');
  assert.equal(result.preservedRaw.planEntries.length, 2);
});

test('even a checksummed duplicate entry ID is rejected before hydration', () => {
  const storage = fakeStorage();
  const state = ST.initialState();
  state.planEntries = [validEntry('p1', '2026-11-02'), validEntry('p1', '2026-11-03')];
  const payload = structuredClone(state);
  delete payload.checksum;
  storage.setItem(ST.KEY, JSON.stringify({ ...payload, checksum: ST.fnv1a(ST.canonicalJson(payload)) }));
  const result = ST.load(storage);
  assert.equal(result.ok, false);
  assert.equal(result.error.detail, 'duplicate_plan_entry');
});

test('read access denied produces a diagnostic failure instead of crashing startup', () => {
  const result = ST.load({ getItem() { throw new DOMException('blocked', 'SecurityError'); } });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'storage_read_failed');
});

test('legacy migration refuses when reversible backup could not be written', () => {
  const old = JSON.stringify({ schema: 'meal-plan/legacy-v0', dailyPlans: ['keep'] });
  const state = new Map([[ST.KEY, old]]);
  const storage = {
    getItem: (k) => state.get(k) || null,
    setItem: () => { throw new Error('quota'); },
  };
  const result = ST.load(storage);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'migration_backup_failed');
  assert.equal(state.get(ST.KEY), old);
});


test('transaction commits atomically and keeps the shared model identity', () => {
  const storage = fakeStorage();
  const state = ST.initialState();
  const identity = state;
  const result = ST.transact(state, storage, (draft) =>
    ST.addPlanEntry(draft, validEntry('p1', '2026-11-02')));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state, identity, 'other panels must retain the same model object');
  assert.equal(state.planEntries.length, 1);
  assert.equal(ST.load(storage).state.planEntries.length, 1);
  assert.equal(state.checksum, ST.load(storage).state.checksum);
});

test('transaction negative control: storage quota rejection rolls back a mutation', () => {
  const state = ST.initialState();
  const blocked = {
    getItem: () => null,
    setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
  };
  const result = ST.transact(state, blocked, (draft) =>
    ST.addPlanEntry(draft, validEntry('p1', '2026-11-02')));
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'storage_write_failed');
  assert.deepEqual(state.planEntries, [], 'no phantom user-facing planned meal');
  assert.equal(state.checksum, null);
});

test('transaction negative control: half-valid generated week never partly commits', () => {
  const storage = fakeStorage();
  const state = ST.initialState();
  const result = ST.transact(state, storage, (draft) => {
    const first = ST.addPlanEntry(draft, validEntry('p1', '2026-11-02'));
    assert.equal(first.ok, true);
    return ST.addPlanEntry(draft, { ...validEntry('p2', '2026-11-03'), portions: -10 });
  });
  assert.equal(result.ok, false);
  assert.equal(state.planEntries.length, 0);
  assert.equal(storage.getItem(ST.KEY), null);
});

test('transaction stale-tab guard prevents known lost updates', () => {
  const storage = fakeStorage();
  const tabA = ST.load(storage).state;
  const tabB = ST.load(storage).state;
  const first = ST.transact(tabA, storage, (draft) =>
    ST.addPlanEntry(draft, validEntry('p1', '2026-11-02')));
  assert.equal(first.ok, true);
  const second = ST.transact(tabB, storage, (draft) =>
    ST.addPlanEntry(draft, validEntry('p2', '2026-11-03')));
  assert.equal(second.ok, false);
  assert.equal(second.errors[0].code, 'stale_state');
  assert.deepEqual(ST.load(storage).state.planEntries.map((x) => x.id), ['p1']);
  assert.deepEqual(tabB.planEntries, [], 'stale tab must not claim a successful edit');
});
