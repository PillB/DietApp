/*
 * P2.1/P2.2 — calendar & repeat core. Pure; local ISO date strings only.
 * All math uses local-noon Date objects (12:00) with 2-way validation, so no
 * UTC-rollover, no timezone-dependent drift, and Lima's permanent -05:00 with
 * no DST cannot inject off-by-one days. Browser + Node (UMD).
 *
 * Week semantics are explicit (P2.4): `nextMonday(date)` always returns the
 * NEXT Monday strictly after the given date; "week containing today" is a
 * separate caller decision via weekOf(today) — never silently conflated.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CalendarCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function realCalendarDate(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
      throw Object.assign(new Error(`not a YYYY-MM-DD local date: ${v}`), { code: 'bad_local_date' });
    }
    const [y, m, d] = String(v).split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0, 0);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      throw Object.assign(new Error(`not a real calendar date: ${v}`), { code: 'invalid_local_date' });
    }
    return date;
  }
  const toIso = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const withOffset = (iso, days) => {
    const d = realCalendarDate(iso);
    d.setDate(d.getDate() + days);
    return toIso(d);
  };

  /** Strictly next Monday (upcoming-week semantics). */
  function nextMonday(iso) {
    const d = realCalendarDate(iso);
    const diff = (8 - d.getDay()) % 7 || 7; // Mon=1: from Mon jump 7
    d.setDate(d.getDate() + diff);
    return toIso(d);
  }

  /** Monday-anchored 7-day window containing `iso`. */
  function weekOf(iso) {
    const d = realCalendarDate(iso);
    const back = d.getDay() === 0 ? 6 : d.getDay() - 1; // Sunday wraps to the previous week's Monday
    d.setDate(d.getDate() - back);
    const monday = toIso(d);
    return Array.from({ length: 7 }, (_, i) => withOffset(monday, i));
  }

  /** Inclusive date range generator; asserts the end exists and is not before start. */
  function datesInRange(fromIso, toIsoStr) {
    const from = realCalendarDate(fromIso);
    const to = realCalendarDate(toIsoStr);
    if (to < from) throw Object.assign(new Error(`end before start: ${fromIso}..${toIsoStr}`), { code: 'bad_range' });
    const days = Math.round((to - from) / 86400000);
    return Array.from({ length: days + 1 }, (_, i) => toIso(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12)));
  }

  /**
   * Expand a repeat rule into occurrence dates. Rule:
   * { startDate, weekdays: [1=Mon..5=Fri, 6=Sat, 0=Sun], acrossWeeks: N>=1,
   *   exceptions: [dates] }. Weeks counted from the Monday of startDate so a
   * mid-week start doesn't shorten its first week.
   */
  function expandRepeatRule(rule) {
    const invalid = [];
    if (!rule || typeof rule.startDate !== 'string') invalid.push('requires startDate');
    if (!Array.isArray(rule.weekdays) || rule.weekdays.some((w) => !Number.isInteger(w) || w < 0 || w > 6)) invalid.push('weekdays must be integers 0..6');
    if (!Number.isInteger(rule.acrossWeeks) || rule.acrossWeeks < 1 || rule.acrossWeeks > 105) invalid.push('acrossWeeks must be an integer 1..105');
    if (invalid.length) throw Object.assign(new Error(`invalid rule: ${invalid.join('; ')}`), { code: 'bad_repeat_rule' });
    const startDate = realCalendarDate(rule.startDate);
    const monday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1), 12);
    const exceptions = new Set(rule.exceptions || []);
    const out = [];
    for (let w = 0; w < rule.acrossWeeks; w++) {
      for (const wd of rule.weekdays.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))) { // ascending Mon..Sun within week
        const dayOffset = w * 7 + ((wd + 6) % 7);
        const iso = toIso(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + dayOffset, 12));
        if (iso >= toIso(startDate) && !exceptions.has(iso)) out.push(iso);
      }
    }
    return out;
  }

  /**
   * Portions aggregable per date within an INCLUSIVE range. Same-day duplicates
   * of the same recipe are separate occurrences and their portions BOTH count.
   * Entries must already be schema-valid PlanEntry-like records.
   */
  function sumPortionsInRange(entries, fromIso, toIsoStr) {
    if (toIsoStr < fromIso) throw Object.assign(new Error(`end before start: ${fromIso}..${toIsoStr}`), { code: 'bad_range' });
    const rows = new Map();
    for (const e of entries) {
      if (e.localDate < fromIso || e.localDate > toIsoStr) continue;
      if (!rows.has(e.localDate)) {
        rows.set(e.localDate, { localDate: e.localDate, recipeId: e.recipeId, portions: 0, occurrences: [] });
      }
      const row = rows.get(e.localDate);
      row.portions += e.portions;
      row.occurrences.push({ id: e.id, slot: e.slot, portions: e.portions });
    }
    return [...rows.values()].sort((a, b) => a.localDate.localeCompare(b.localDate));
  }

  return { nextMonday, weekOf, datesInRange, expandRepeatRule, sumPortionsInRange, realCalendarDate };
});
