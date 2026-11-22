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
      return { ok: true, checksum: doc.checksum };
    } catch (err) {
      return { ok: false, error: { code: 'storage_write_failed', detail: String(err && err.name) } };
    }
  }

  function stateShapeError(doc) {
    for (const field of ['planEntries', 'repeatRules', 'pantry']) {
      if (!Array.isArray(doc[field])) return 'bad_collection_' + field;
    }
    if (!doc.settings || typeof doc.settings !== 'object' || Array.isArray(doc.settings)) return 'bad_settings';
    if (typeof doc.updatedAt !== 'string' || !Number.isFinite(Date.parse(doc.updatedAt))) return 'bad_updatedAt';
    const ids = new Set();
    for (const entry of doc.planEntries) {
      if (!S.validatePlanEntry(entry).ok) return 'bad_plan_entry';
      if (ids.has(entry.id)) return 'duplicate_plan_entry';
      ids.add(entry.id);
    }
    return null;
  }

  function load(storage) {
    let raw;
    try { raw = storage.getItem(KEY); }
    catch (err) { return { ok: false, error: { code: 'storage_read_failed', detail: String(err && err.name) }, preservedRaw: null }; }
    if (!raw) return { ok: true, state: initialState(), preservedRaw: null };
    let doc;
    try {
      doc = JSON.parse(raw);
    } catch (err) {
      return { ok: false, error: { code: 'unparseable_state', detail: String(err.name) }, preservedRaw: raw };
    }
    // A JSON value can be null, a scalar or an array; all are invalid docs.
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      return { ok: false, error: { code: 'invalid_state_shape', detail: 'not_object' }, preservedRaw: doc, rawString: raw };
    }
    // classification BEFORE checksum: we cannot even trust *why* unsigned docs fail
    if (doc.schema === 'meal-plan/legacy-v0' || doc.schema === 'meal-plan/legacy') {
      try { storage.setItem(BACKUP_KEY, raw); }
      catch (err) { return { ok: false, error: { code: 'migration_backup_failed', detail: String(err && err.name) }, preservedRaw: doc, rawString: raw }; } // never migrate without backup
      // Do NOT fabricate a mapping for legacy content here (P1.2 honesty rule:
      // legacy prose plans quarantine until human normalization). Preserve.
      const state = initialState();
      state.updatedAt = new Date().toISOString();
      const persisted = save(state, storage);
      if (!persisted.ok) return { ok: false, error: persisted.error, preservedRaw: doc, rawString: raw };
      return { ok: true, state, preservedRaw: doc, migrationNeeded: 'legacy-v0-into-planEntries-pending-normalization' };
    }
    if (doc.schema !== 'state/v1') {
      return { ok: false, error: { code: 'unsupported_schema_version', schema: doc.schema } };
    }
    const { checksum, ...rest } = doc;
    if (fnv1a(canonicalJson(rest)) !== checksum) {
      return { ok: false, error: { code: 'checksum_mismatch' }, preservedRaw: doc, rawString: raw };
    }
    const problem = stateShapeError(doc);
    if (problem) return { ok: false, error: { code: 'invalid_state_shape', detail: problem }, preservedRaw: doc, rawString: raw };
    return { ok: true, state: doc };
  }

  /**
   * Commit-or-rollback for synchronous browser plan edits.
   * The original model remains untouched until a validated draft is persisted.
   * A stored checksum guards against a *known* stale-tab update; browser storage
   * lacks atomic compare-and-swap, so simultaneous writes remain a documented
   * limit and require a transactional backend for a hard guarantee.
   */
  function transact(state, storage, operation) {
    const current = load(storage);
    if (!current.ok) return { ok: false, errors: [current.error] };
    if ((state.checksum || null) !== (current.state.checksum || null)) {
      return { ok: false, errors: [{ code: 'stale_state', message: 'Reload latest plan before editing' }] };
    }
    const draft = structuredClone(state);
    let outcome;
    try { outcome = operation(draft); }
    catch (err) { return { ok: false, errors: [{ code: 'mutation_failed', detail: String(err && err.message) }] }; }
    if (!outcome || !outcome.ok) return outcome || { ok: false, errors: [{ code: 'mutation_refused' }] };
    const problem = stateShapeError(draft);
    if (problem) return { ok: false, errors: [{ code: 'invalid_state_shape', detail: problem }] };
    const saved = save(draft, storage);
    if (!saved.ok) return { ok: false, errors: [saved.error] };
    draft.checksum = saved.checksum;
    for (const key of Object.keys(state)) if (!(key in draft)) delete state[key];
    Object.assign(state, draft);
    return outcome;
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

  return { KEY, BACKUP_KEY, initialState, addPlanEntry, save, load, transact, mergeStates, resolveWeek, verify, canonicalJson, fnv1a };
});
