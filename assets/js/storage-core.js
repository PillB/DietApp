/*
 * P2.3/P2.4 — persistence core (versioned, checksummed, reversible).
 * Storage backend is INJECTED (localStorage in browser, any Map-backed object
 * in tests) — pure logic here. All dates are local ISO strings from
 * CalendarCore (never `toISOString` on local midnight).
 *
 * Honesty rules:
 *  - checksum (FNV-1a over canonical JSON) verified on every load;
 *    mismatch refuses WITH the preserved raw — never vanish data silently;
 *  - unknown future schema versions refuse (no optimistic guesses);
 *  - forward migrations write a backup entry BEFORE transforming (reversibility);
 *  - conflict merge = union by entry id, newest updatedAt wins headers/settings;
 *  - weekly window policy is an explicit user setting, never silent.
 * Browser (window.StorageCore) + Node (module.exports).
 */
(function (root, factory) {
  const C = typeof require === 'function' ? require('./calendar-core.js') : root.CalendarCore;
  const S = typeof require === 'function' ? require('./domain-schema.js') : root.DomainSchema;
  const api = factory(C, S);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StorageCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (C, S) {
  'use strict';

  const KEY = 'pgk-state-v1';
  const BACKUP_KEY = 'pgk-state-preMigration';

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function canonicalJson(x) {
    const sort = (v) => Array.isArray(v) ? v.map(sort) : (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, w]) => [k, sort(w)])) : v);
    return JSON.stringify(sort(x));
  }

  function initialState() {
    return {
      schema: 'state/v1',
      planEntries: [],
      repeatRules: [],
      pantry: [],
      optionalChoices: {},
      packages: {},
      settings: { weekStartPolicy: 'upcoming-week', locale: 'es-PE' },
      updatedAt: '1970-01-01T00:00:00Z',
      checksum: null,
    };
  }

  /** Adds an entry only if schema-valid and id-free — refuses at the boundary. */
  function addPlanEntry(state, entry) {
    const v = S.validatePlanEntry(entry);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (state.planEntries.some((e) => e.id === entry.id)) return { ok: false, errors: [{ path: 'id', code: 'duplicate_id' }] };
    state.planEntries.push(structuredClone(entry));
    state.updatedAt = new Date().toISOString();
    return { ok: true };
  }

  function save(state, storage) {
    const doc = JSON.parse(JSON.stringify(state));
    delete doc.checksum; // checksum hashes payload WITHOUT the field (same rule as load)
    doc.checksum = fnv1a(canonicalJson(doc));
    try {
      storage.setItem(KEY, JSON.stringify(doc));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: { code: 'storage_write_failed', detail: String(err && err.name) } };
    }
  }

  function load(storage) {
    const raw = storage.getItem(KEY);
    if (!raw) return { ok: true, state: initialState(), preservedRaw: null };
    let doc;
    try {
      doc = JSON.parse(raw);
    } catch (err) {
      return { ok: false, error: { code: 'unparseable_state', detail: String(err.name) }, preservedRaw: raw };
    }
    // classification BEFORE checksum: we cannot even trust *why* unsigned docs fail
    if (doc.schema === 'meal-plan/legacy-v0' || doc.schema === 'meal-plan/legacy') {
      storage.setItem(BACKUP_KEY, raw); // reversibility BEFORE forward migration
      // Do NOT fabricate a mapping for legacy content here (P1.2 honesty rule:
      // legacy prose plans quarantine until human normalization). Preserve.
      const state = initialState();
      state.updatedAt = new Date().toISOString();
      save(state, storage);
      return { ok: true, state, preservedRaw: doc, migrationNeeded: 'legacy-v0-into-planEntries-pending-normalization' };
    }
    if (doc.schema !== 'state/v1') {
      return { ok: false, error: { code: 'unsupported_schema_version', schema: doc.schema } };
    }
    const { checksum, ...rest } = doc;
    if (fnv1a(canonicalJson(rest)) !== checksum) {
      return { ok: false, error: { code: 'checksum_mismatch' }, preservedRaw: doc, rawString: raw };
    }
    return { ok: true, state: doc };
  }

  /** Tab-conflict merge: union by entry id per collection; newer write wins headers. */
  function mergeStates(a, b) {
    const base = a.updatedAt >= b.updatedAt ? a : b;
    const short = base === a ? b : a;
    const merged = structuredClone(base);
    for (const field of ['planEntries', 'repeatRules', 'pantry']) {
      const seen = new Set(base[field].map((x) => x.id));
      merged[field] = [...base[field], ...short[field].filter((x) => !seen.has(x.id))];
    }
    merged.settings = { ...short.settings, ...base.settings };
    return merged;
  }

  /** P2.4 — the two disclosed "upcoming week" semantics, verbatim CalendarCore. */
  function resolveWeek(todayIso, weekStartPolicy) {
    if (weekStartPolicy === 'week-containing-today') return { label: weekStartPolicy, mondayToSunday: C.weekOf(todayIso) };
    if (weekStartPolicy === 'upcoming-week') {
      const monday = C.nextMonday(todayIso);
      return { label: weekStartPolicy, mondayToSunday: Array.from({ length: 7 }, (_, i) => withOffset(monday, i)) };
    }
    throw Object.assign(new Error(`unknown weekStartPolicy: ${weekStartPolicy}`), { code: 'unknown_week_policy' });
  }
  function withOffset(iso, days) {
    const d = C.realCalendarDate(iso);
    d.setDate(d.getDate() + days);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function verify(storedDoc) {
    try {
      const { checksum, ...rest } = JSON.parse(typeof storedDoc === 'string' ? storedDoc : JSON.stringify(storedDoc));
      return fnv1a(canonicalJson(rest)) === checksum;
    } catch { return false; }
  }

  return { KEY, BACKUP_KEY, initialState, addPlanEntry, save, load, mergeStates, resolveWeek, verify, canonicalJson, fnv1a };
});
