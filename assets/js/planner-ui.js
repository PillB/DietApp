/*
 * P2.2 — Planner UI (canonical engine, DEVELOPMENT PREVIEW).
 * Keyboard-first: NO drag-and-drop in v4 — move/copy/delete/repeat are explicit
 * dated button operations (each with a real accessible name), so keyboard
 * reachability is structural, not retrofitted.
 * Pure operations live in PlannerCore; this file is thin DOM glue over
 * StorageCore.state (shared with ShoppingUI; save on every mutation).
 * Browser (window.PlannerUI) only — no Node path needed.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PlannerUI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function init(opts) {
    const dom = opts.dom || document;
    const section = dom.getElementById('planner');
    if (!section || !opts.model) return { mounted: false };
    const deps = () => ({ P: root.PlannerCore, ST: root.StorageCore });
    buildStaticSkeleton(section);
    const listEl = section.querySelector('#planner-entries');
    listEl.addEventListener('click', (ev) => entryAction(ev, opts.model, deps, section));
    listEl.addEventListener('change', (ev) => entryAction(ev, opts.model, deps, section));
    renderEntries(section, opts.model);
    root.__pgkRefreshPlanner = () => renderEntries(section, opts.model);
    return { mounted: true };
  }

  function buildStaticSkeleton(section) {
    if (section.dataset.built === '1') return;
    section.dataset.built = '1';
    section.innerHTML = `
      <h2 id="planner-h2" class="text-xl font-bold text-amber-200">Planner (development preview)</h2>
      <p class="text-sm text-stone-300">Keyboard-first: <kbd>Tab</kbd> reaches every entry; buttons do exactly what they say. No drag-and-drop.</p>
      <div id="planner-status" role="status" aria-live="polite" class="mt-2 text-xs text-amber-100/80"></div>
      <ol id="planner-entries" class="mt-3 space-y-2"></ol>
    `;
  }

  function renderEntries(section, model) {
    const listEl = section.querySelector('#planner-entries');
    const status = section.querySelector('#planner-status');
    if (!listEl) return;
    const rows = model.state.planEntries.slice().sort((a, b) => a.localDate.localeCompare(b.localDate) || a.id.localeCompare(b.id));
    listEl.innerHTML = rows.length ? rows.map((e) => `
      <li class="flex flex-wrap items-center gap-2 rounded border border-stone-700 px-2 py-1" data-entry="${e.id}">
        <span class="text-stone-200 w-28">${e.localDate}</span>
        <span class="text-stone-300">${e.recipeId} ×${e.portions}</span>
        <label class="sr-only" for="move-${e.id}">Move ${e.recipeId} (${e.id}) to date</label>
        <input id="move-${e.id}" type="date" value="${e.localDate}" class="bg-stone-800 border border-stone-600 rounded px-1 py-0.5 text-xs" data-op="move" data-entry="${e.id}">
        <button class="rounded border border-stone-500 px-2 py-0.5 text-xs" data-op="copy" data-entry="${e.id}" aria-label="Copy ${e.recipeId} ${e.id} to chosen date">Copy to date →</button>
        <button class="rounded border border-stone-500 px-2 py-0.5 text-xs" data-op="del" data-entry="${e.id}" aria-label="Delete ${e.recipeId} ${e.id}">Delete</button>
        <label class="text-xs" for="weeks-${e.id}">Repeat ×</label>
        <input id="weeks-${e.id}" type="number" min="1" max="52" value="2" data-op="weeks" data-entry="${e.id}" class="w-14 bg-stone-800 border border-stone-600 rounded px-1 py-0.5 text-xs">
        <button class="rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-200" data-op="repeat" data-entry="${e.id}" aria-label="Repeat ${e.recipeId} ${e.id} weekly by weekday">Repeat weekly (same weekday)</button>
      </li>`).join('') : '<li class="text-stone-400">(no plan entries yet — add one at the shopping panel)</li>';
    status.textContent = `${rows.length} plan entr${rows.length === 1 ? 'y' : 'ies'}`;
  }

  function entryAction(ev, model, deps, section) {
    const target = ev.target.closest('[data-op]');
    if (!target) return;
    const id = target.dataset.entry;
    const op = target.dataset.op;
    const P = deps().P;
    let res;
    if (op === 'move') {
      const entry = model.state.planEntries.find((x) => x.id === id);
      if (!entry || entry.localDate === target.value) return;
      res = P.moveEntry(model.state, id, target.value);
    } else if (op === 'copy') {
      const pendingDate = target.closest('li').querySelector('[data-op="move"]').value;
      res = P.copyEntry(model.state, id, pendingDate);
    } else if (op === 'del') {
      res = P.deleteEntry(model.state, id);
    } else if (op === 'repeat') {
      const weeks = Number(target.closest('li').querySelector('[data-op="weeks"]').value || 0);
      const entry = model.state.planEntries.find((x) => x.id === id);
      res = weeks >= 1 ? P.applyRepeat(model.state, {
        sourceEntryId: id,
        rule: { startDate: entry.localDate, weekdays: [weekdayIndexOf(entry.localDate)], acrossWeeks: weeks, exceptions: [] },
        skipFirst: true,
      }) : { ok: false, errors: [{ code: 'bad_weeks' }] };
    } else {
      return;
    }
    const status = section.querySelector('#planner-status');
    if (res.ok) {
      root.StorageCore.save(model.state, {
        getItem: (k) => root.localStorage.getItem(k),
        setItem: (k, v) => root.localStorage.setItem(k, v),
        removeItem: (k) => root.localStorage.removeItem(k),
      });
      renderEntries(section, model);
      if (root.ShoppingUI && root.__pgkRefreshShopping) root.__pgkRefreshShopping();
      status.textContent = `${op} ok`;
    } else {
      status.textContent = `Refused: ${res.errors.map((e) => e.code).join(', ')}`;
    }
  }

  function weekdayIndexOf(localDate) {
    const [y, m, d] = localDate.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getDay();
  }

  return { init, renderEntries, entryAction, weekdayIndexOf };
});
