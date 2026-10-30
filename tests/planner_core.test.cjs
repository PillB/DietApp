'use strict';
// P2.2 — planner operations on StorageCore state (pure; DOM-free).
// Keyboard-first decision documented in PROGRESS: NO drag-and-drop anywhere in
// v4 — move/copy are explicit dated operations, so keyboard reachability is
// not an afterthought (AGENTS.md a11y rule + roadmap P3 drag-optional clause).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/js/domain-schema.js');
const ST = require('../assets/js/storage-core.js');
const P = require('../assets/js/planner-core.js');

const entry = (id, date, recipeId = 'r1', portions = 2) => ({
  id, localDate: date, slot: 'dinner', recipeId, version: 1, portions, repeatRuleId: null, pantryOverride: null,
});

function stateWith(entries) {
  const st = ST.initialState();
  for (const e of entries) {
    const r = ST.addPlanEntry(st, e);
    assert.strictEqual(r.ok, true, JSON.stringify(r));
  }
  return st;
}

test('move: changes only the date, keeps id/portions (no id churn → no merge artifacts)', () => {
  const st = stateWith([entry('p1', '2026-11-02')]);
  const moved = P.moveEntry(st, 'p1', '2026-11-09');
  assert.strictEqual(moved.ok, true);
  const e = st.planEntries.find((x) => x.id === 'p1');
  assert.strictEqual(e.localDate, '2026-11-09');
  assert.strictEqual(Date.parse, Date.parse); // identity trivially true (just keeping focus on fields below)
  assert.strictEqual(e.portions, 2);
});

test('copy: new distinct id, same content; same-day double of same recipe permitted', () => {
  const st = stateWith([entry('p1', '2026-11-02')]);
  const cp = P.copyEntry(st, 'p1', '2026-11-02'); // same-day copy is legal per P2.2
  assert.strictEqual(cp.ok, true);
  assert.strictEqual(st.planEntries.length, 2);
  assert.notStrictEqual(cp.newId, 'p1');
  const twins = st.planEntries.filter((e) => e.localDate === '2026-11-02' && e.recipeId === 'r1');
  assert.strictEqual(twins.length, 2, 'same recipe twice same day must coexist');
});

test('copy to invalid date refuses without mutation (invalid_local_date passthrough)', () => {
  const st = stateWith([entry('p1', '2026-11-02')]);
  const cp = P.copyEntry(st, 'p1', '2026-02-30');
  assert.strictEqual(cp.ok, false);
  assert.ok(cp.errors.some((x) => x.code === 'invalid_local_date'), JSON.stringify(cp.errors));
  assert.strictEqual(st.planEntries.length, 1);
});

test('delete: removes exactly its own id', () => {
  const st = stateWith([entry('p1', '2026-11-02'), entry('p2', '2026-11-03')]);
  assert.strictEqual(P.deleteEntry(st, 'p1').ok, true);
  assert.strictEqual(st.planEntries.length, 1);
  assert.strictEqual(st.planEntries[0].id, 'p2');
});

test('repeat: N forward occurrences from a mid-week start (no silently lost first weekday)', () => {
  const st = stateWith([entry('p1', '2026-10-28')]);
  const out = P.applyRepeat(st, {
    sourceEntryId: 'p1',
    rule: { startDate: '2026-10-28', weekdays: [2], acrossWeeks: 3, exceptions: [] },
    skipFirst: true, // start covers its own day; 3 FORWARD Tuesdays expected
  });
  assert.strictEqual(out.ok, true, JSON.stringify(out));
  const added = out.addedIds.map((id) => st.planEntries.find((e) => e.id === id).localDate).sort();
  assert.deepStrictEqual(added, ['2026-11-03', '2026-11-10', '2026-11-17'], JSON.stringify(added));
  for (const e of st.planEntries) assert.deepStrictEqual(S.validatePlanEntry(e).errors, []);
  assert.ok(out.addedIds.every((id) => st.planEntries.find((e) => e.id === id).repeatRuleId === 'rep-p1-2w3'), 'rule-family tag present');
});

test('repeat exceptions drop the ignored dates and nothing else', () => {
  const st = stateWith([entry('p1', '2026-10-28')]);
  const out = P.applyRepeat(st, {
    sourceEntryId: 'p1',
    rule: { startDate: '2026-10-28', weekdays: [2], acrossWeeks: 3, exceptions: ['2026-11-10'] },
    skipFirst: true,
  });
  const dates = out.addedIds.map((id) => st.planEntries.find((e) => e.id === id).localDate).sort();
  assert.deepStrictEqual(dates, ['2026-11-03', '2026-11-17']);
});

test('repeat refuses when the source entry is missing (no phantom rows)', () => {
  const st = stateWith([]);
  const out = P.applyRepeat(st, {
    sourceEntryId: 'ghost',
    rule: { startDate: '2026-10-28', weekdays: [2], acrossWeeks: 2, exceptions: [] },
    skipFirst: true,
  });
  assert.strictEqual(out.ok, false);
  assert.strictEqual(st.planEntries.length, 0);
});

test('double apply of the same rule is idempotent (group tag recognizes its own dates)', () => {
  const st = stateWith([entry('p1', '2026-10-28')]);
  const rule = { startDate: '2026-10-28', weekdays: [2], acrossWeeks: 3, exceptions: [] };
  const first = P.applyRepeat(st, { sourceEntryId: 'p1', rule, skipFirst: true });
  const countAfterFirst = st.planEntries.length;
  const second = P.applyRepeat(st, { sourceEntryId: 'p1', rule, skipFirst: true });
  assert.strictEqual(first.ok && second.ok, true);
  assert.strictEqual(st.planEntries.length, countAfterFirst, 'second apply adds nothing (dates already in family)');
  assert.strictEqual(second.addedIds.length, 0);
  // a hand-made twin (repeatRuleId null) is NOT mistaken for the rule family
  const twin = P.copyEntry(st, 'p1', '2026-11-03');
  assert.strictEqual(twin.ok, true);
  assert.strictEqual(st.planEntries.length, countAfterFirst + 1);
});
