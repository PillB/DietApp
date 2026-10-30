/*
 * P2.2 — planner core operations (PURE, DOM-free).
 * Keyboard-first: no drag-and-drop anywhere in v4; move/copy/repeat are explicit
 * dated operations (keyboard reachable by construction).
 * Rules:
 *  - move changes ONLY localDate (id stable — no downstream merge artifacts);
 *  - copy allocates a FRESH id; same-day twins are legitimate occurrences;
 *  - invalid dates refuse without mutation (invalid_local_date via schema);
 *  - repeat expands via CalendarCore.expandRepeatRule, tagging every generated
 *    entry with the rule id; exceptions honored; the start entry may skip itself;
 *  - NEVER generates an entry the schema would reject (fail-fast, additive).
 * Browser (window.PlannerCore) + Node (module.exports).
 */
(function (root, factory) {
  const S = typeof require === 'function' ? require('./domain-schema.js') : root.DomainSchema;
  const C = typeof require === 'function' ? require('./calendar-core.js') : root.CalendarCore;
  const api = factory(S, C);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlannerCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (S, C) {
  'use strict';

  function freshId(prefix, taken) {
    let n = 1;
    let id = `${prefix}-r${n}`;
    while (taken.has(id)) { n += 1; id = `${prefix}-r${n}`; }
    return id;
  }

  function moveEntry(state, entryId, toLocalDate) {
    const e = state.planEntries.find((x) => x.id === entryId);
    if (!e) return { ok: false, errors: [{ path: 'id', code: 'entry_not_found' }] };
    const probe = S.validatePlanEntry({ ...e, localDate: toLocalDate });
    if (!probe.ok) return { ok: false, errors: probe.errors };
    e.localDate = toLocalDate;
    state.updatedAt = new Date().toISOString();
    return { ok: true };
  }

  function copyEntry(state, entryId, toLocalDate) {
    const e = state.planEntries.find((x) => x.id === entryId);
    if (!e) return { ok: false, errors: [{ path: 'id', code: 'entry_not_found' }] };
    const copy = { ...structuredClone(e), localDate: toLocalDate, repeatRuleId: null };
    const v = S.validatePlanEntry(copy);
    if (!v.ok) return { ok: false, errors: v.errors };
    copy.id = freshId(`p${Date.now().toString(36)}`, new Set(state.planEntries.map((x) => x.id)));
    state.planEntries.push(copy);
    state.updatedAt = new Date().toISOString();
    return { ok: true, newId: copy.id };
  }

  function deleteEntry(state, entryId) {
    const before = state.planEntries.length;
    state.planEntries = state.planEntries.filter((x) => x.id !== entryId);
    if (state.planEntries.length === before) return { ok: false, errors: [{ path: 'id', code: 'entry_not_found' }] };
    state.updatedAt = new Date().toISOString();
    return { ok: true };
  }

  function applyRepeat(state, { sourceEntryId, rule, skipFirst }) {
    const source = state.planEntries.find((x) => x.id === sourceEntryId);
    if (!source) return { ok: false, errors: [{ path: 'id', code: 'entry_not_found' }] };
    // Group id: stable per (source, rule shape). Schema-safe slug (no colons):
    // DomainSchema.ID_RE allows only lowercase word/underscore/hyphen slugs.
    const groupId = `rep-${sourceEntryId}-${(rule.weekdays || []).join('')}w${rule.acrossWeeks ?? '?'}`;
    const groupDates = new Set(state.planEntries.filter((e) => e.repeatRuleId === groupId).map((e) => e.localDate));
    // N occurrences semantics: mid-week starts must not silently lose the first
    // pending weekday, so expand a padded window and take the first N AFTER source.
    let wide;
    try {
      wide = C.expandRepeatRule({ ...rule, acrossWeeks: (rule.acrossWeeks || 0) + 1 });
    } catch (err) {
      return { ok: false, errors: [{ path: 'rule', code: err.code || 'bad_repeat_rule', message: String(err.message) }] };
    }
    const futureDates = wide.filter((d) => d > source.localDate);
    const pending = futureDates.filter((d) => !groupDates.has(d)).slice(0, rule.acrossWeeks);
    const taken = new Set(state.planEntries.map((x) => x.id));
    const addedIds = [];
    const exceptions = new Set(rule.exceptions || []);
    for (const date of pending) {
      if (exceptions.has(date)) continue;
      if (skipFirst && date === source.localDate) continue;
      const rec = { ...structuredClone(source), localDate: date, repeatRuleId: groupId };
      if (!taken.has(rec.id)) delete rec.id; // freshId assignment below guarantees no collision
      const v = S.validatePlanEntry({ ...rec, id: rec.id || 'x' });
      if (!v.ok) return { ok: false, errors: v.errors }; // atomic: refuse rather than partial family
      rec.id = freshId(sourceEntryId, taken);
      state.planEntries.push(rec);
      taken.add(rec.id);
      addedIds.push(rec.id);
    }
    state.updatedAt = new Date().toISOString();
    return { ok: true, addedIds, ruleTag: groupId };
  }

  return { moveEntry, copyEntry, deleteEntry, applyRepeat, freshId };
});
