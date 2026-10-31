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
    section.querySelector('#deficit-build-btn').addEventListener('click', () => buildDeficitWeek(section, opts.model));
    section.querySelector('#adequacy-btn').addEventListener('click', () => renderAdequacy(section, opts.model));
    renderEntries(section, opts.model);
    root.__pgkRefreshPlanner = () => renderEntries(section, opts.model);
    return { mounted: true };
  }

  const SLOT_CANDIDATE_RULES = [
    { slot: 'desayuno', diets: ['breakfast'] },
    { slot: 'almuerzo', diets: ['lunch/dinner', 'lunch'] },
    { slot: 'cena', diets: ['dinner', 'lunch/dinner'] },
    { slot: '11am', diets: ['breakfast/shared', 'snack/shared'] },
    { slot: 'refrigerio', diets: ['breakfast', 'snack/shared', 'breakfast shared'] },
  ];

  function candidatesForSlot(model, slot, rules) {
    const docx = model.docxRecipes || [];
    const rule = rules.find((r) => r.slot === slot);
    const docxMatches = docx.filter((r) => (r.dietaryContext || '').toLowerCase().includes((rule ? rule.diets.find((d) => (r.dietaryContext || '').toLowerCase().includes(d)) : '') || '__nomatch__'));
    const weighed = ['almuerzo', 'cena'].includes(slot) ? (model.recipes || []) : [];
    return [...new Set([...docxMatches.map((r) => r.id), ...weighed.map((r) => r.id)])];
  }

  function buildDeficitWeek(section, model) {
    const DP = root.DeficitPlanner;
    const ack = section.querySelector('#deficit-ack').checked;
    const target = Number(section.querySelector('#deficit-target').value);
    const status = section.querySelector('#planner-status');
    const hints = collectSlotCandidates(model);
    let out;
    try {
      out = DP.planDeficitWeek(deficitArgs(model, ack, target, hints));
    } catch (err) {
      status.textContent = `Refused: ${err.code || err.message}`;
      return;
    }
    applyWeekEntries(section, model, status, out);
  }

  function collectSlotCandidates(model) {
    const hints = {};
    for (const slot of ['desayuno', 'almuerzo', 'cena', '11am', 'refrigerio']) {
      const cands = candidatesForSlot(model, slot, SLOT_CANDIDATE_RULES);
      if (cands.length) hints[slot] = cands;
    }
    return hints;
  }

  function deficitArgs(model, ack, target, hints) {
    return {
      recipes: [...(model.recipes || []), ...(model.docxRecipes || [])],
      slotHints: hints, targetKcal: target,
      policy: { clinicianReviewAcknowledged: ack },
      startFromIso: todayLocal(),
      profile: root.LAST_FLAVOR_PROFILE || { dishPool: 0, items: [], excluded: { categories: [] }, caveats: [] },
      lexicon: root.FLAVOR_LEXICON || null,
      storeCatalog: root.LIMA_STORES_FIXTURE || [],
      householdEquipment: (model.state.settings && model.state.settings.householdEquipment) || ['skillet', 'microwave', 'bowl', 'baking-dish'],
      ingredientCategories: root.INGREDIENT_CATEGORY_BRIDGE || {},
      defaultPortions: { desayuno: 1, almuerzo: 2, cena: 2, '11am': 1, refrigerio: 1 },
    };
  }

  function applyWeekEntries(section, model, status, out) {
    const added = [];
    for (const e of out.entries) {
      const res = root.StorageCore.addPlanEntry(model.state, e);
      if (res.ok) added.push(e.id); else status.textContent = `${root.I18N.t('planner.refused')} ${res.errors.map((x) => x.code).join(', ')}`;
    }
    root.StorageCore.save(model.state, localStoreAdapter());
    renderEntries(section, model);
    if (root.ShoppingUI && root.__pgkRefreshShopping) root.__pgkRefreshShopping();
    renderDeficitExplanations(section, out, added, status);
  }

  function localStoreAdapter() {
    return {
      getItem: (k) => root.localStorage.getItem(k),
      setItem: (k, v) => root.localStorage.setItem(k, v),
      removeItem: (k) => root.localStorage.removeItem(k),
    };
  }

  function renderDeficitExplanations(section, out, added, status) {
    section.querySelector('#deficit-explanations').innerHTML
      = out.picks.map((p) => `<div class="mt-1">${escapeHtml(p.slot)} → <strong>${escapeHtml(p.recipeId)}</strong> — ${escapeHtml(p.explanation)}</div>`).join('')
      + out.warnings.map((w) => `<div class="mt-1 text-amber-300">⚠ ${escapeHtml(w.text || w.code)}</div>`).join('');
    status.textContent = `${root.I18N.t('planner.weekBuilt')} ${out.targetKcal} kcal (${out.category}): ${added.length}`;
  }

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function buildStaticSkeleton(section) {
    if (section.dataset.built === '1') return;
    section.dataset.built = '1';
    const t = (k) => root.I18N.t(k);
    section.innerHTML = `
      <h2 id="planner-h2" class="text-xl font-bold text-amber-200">${t('planner.title')}</h2>
      <p class="text-sm text-stone-300">${t('planner.keyboardNote')}</p>
      <div class="flex items-center gap-2 mt-2">
        <label class="text-xs" for="planner-lang">Language</label>
        <select id="planner-lang" class="bg-stone-800 border border-stone-600 rounded px-2 py-0.5 text-xs">
          ${root.I18N.LOCALES.map((l) => `<option value="${l}">${l}</option>`).join('')}
        </select>
      </div>
      <div id="deficit-build" class="mt-4 rounded border border-amber-300/40 p-3">
        <h3 class="text-sm font-bold text-amber-300">${t('planner.weekBuilder')}</h3>
        <div class="flex flex-wrap items-end gap-3 mt-2">
          <label class="text-sm">${t('planner.dayTarget')}
            <select id="deficit-target" class="bg-stone-800 border border-stone-600 rounded px-2 py-1">
              <option value="1500">1500 kcal (moderate)</option>
              <option value="1400">1400 kcal (aggressive)</option>
              <option value="1200">1200 kcal (aggressive)</option>
            </select></label>
          <label class="text-sm flex items-center gap-2"><input id="deficit-ack" type="checkbox" class="accent-amber-400"> ${t('planner.ackLabel')}</label>
          <button id="deficit-build-btn" class="rounded bg-amber-400 text-stone-950 font-bold px-3 py-1 focus:outline-none focus:ring-2">${t('planner.buildWeek')}</button>
        </div>
        <div id="deficit-explanations" class="mt-2 text-xs" aria-live="polite"></div>
      </div>
      <div id="planner-status" role="status" aria-live="polite" class="mt-2 text-xs text-amber-100/80"></div>
      <div id="adequacy-panel" class="mt-4 rounded border border-stone-700 p-3">
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-sm">Sex (for Fe/Zn RDA)
            <select id="adequacy-sex" class="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs">
              <option value="male">male</option>
              <option value="female">female</option>
            </select></label>
          <button id="adequacy-btn" class="rounded border border-amber-300 px-3 py-1 text-xs text-amber-200 focus:outline-none focus:ring-2">Coverage semanal de micronutrientes</button>
        </div>
        <div id="adequacy-table" class="mt-2 text-xs"></div>
      </div>
      <ol id="planner-entries" class="mt-3 space-y-2"></ol>
    `;
    const langSel = section.querySelector('#planner-lang');
    langSel.value = root.I18N.getLanguage();
    langSel.addEventListener('change', () => {
      root.I18N.setLanguage(langSel.value);
      section.dataset.built = '0'; buildStaticSkeleton(section);
      root.__pgkRefreshPlanner();
    });
  }

  function renderEntries(section, model) {
    const listEl = section.querySelector('#planner-entries');
    const status = section.querySelector('#planner-status');
    if (!listEl) return;
    const rows = model.state.planEntries.slice().sort((a, b) => a.localDate.localeCompare(b.localDate) || (a.repeatRuleId || '').localeCompare(b.repeatRuleId || '') || a.id.localeCompare(b.id));
    const familySizes = new Map();
    for (const e of rows) if (e.repeatRuleId) familySizes.set(e.repeatRuleId, (familySizes.get(e.repeatRuleId) || 0) + 1);
    listEl.innerHTML = rows.length ? rows.map((e) => {
      const fam = e.repeatRuleId ? `<span class="text-amber-300 text-xs" title="repeat family ${e.repeatRuleId}">⟲×${familySizes.get(e.repeatRuleId)}</span>` : '';
      return `
      <li class="flex flex-wrap items-center gap-2 rounded border border-stone-700 px-2 py-1" data-entry="${e.id}">
        <span class="text-stone-200 w-28">${e.localDate}</span>
        <span class="text-stone-300">${e.recipeId} ×${e.portions}</span>
        ${fam}
        <label class="sr-only" for="move-${e.id}">Move ${e.recipeId} (${e.id}) to date</label>
        <input id="move-${e.id}" type="date" value="${e.localDate}" class="bg-stone-800 border border-stone-600 rounded px-1 py-0.5 text-xs" data-op="move" data-entry="${e.id}" aria-label="move ${e.recipeId} ${e.id}">
        <label class="sr-only" for="copydate-${e.id}">Copy ${e.recipeId} (${e.id}) to date</label>
        <input id="copydate-${e.id}" type="date" value="${e.localDate}" class="bg-stone-800 border border-stone-600 rounded px-1 py-0.5 text-xs" data-op="copydate" data-entry="${e.id}">
        <button class="rounded border border-stone-500 px-2 py-0.5 text-xs" data-op="copy" data-entry="${e.id}" aria-label="Copy ${e.recipeId} ${e.id} to copy date">Copy →</button>
        <button class="rounded border border-stone-500 px-2 py-0.5 text-xs" data-op="del" data-entry="${e.id}" aria-label="Delete ${e.recipeId} ${e.id}">Delete</button>
        <label class="text-xs" for="weeks-${e.id}">Repeat ×</label>
        <input id="weeks-${e.id}" type="number" min="1" max="52" value="2" data-op="weeks" data-entry="${e.id}" class="w-14 bg-stone-800 border border-stone-600 rounded px-1 py-0.5 text-xs">
        <button class="rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-200" data-op="repeat" data-entry="${e.id}" aria-label="Repeat ${e.recipeId} ${e.id} weekly by weekday">Repeat weekly (same weekday)</button>
      </li>`;
    }).join('') : '<li class="text-stone-400">(no plan entries yet — add one at the shopping panel)</li>';
    status.textContent = `${rows.length} plan entr${rows.length === 1 ? 'y' : 'ies'}${familySizes.size ? `, ${familySizes.size} repeat famil${familySizes.size === 1 ? 'y' : 'ies'}` : ''}`;
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
      const pendingDate = target.closest('li').querySelector('[data-op="copydate"]').value;
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

  /** LEDGER-8: weekly micronutrient coverage vs NIH ODS RDAs (computed-pending-weighin basis). */
  function renderAdequacy(section, model) {
    const host = section.querySelector('#adequacy-table');
    const A = root.AdequacyCore;
    if (!A) { host.textContent = '(adequacy engine not loaded)'; return; }
    const sex = section.querySelector('#adequacy-sex').value;
    const comp = root.__pgkComposition || {};
    const allRecipes = [...(model.recipes || []), ...(model.docxRecipes || [])];
    // group entries by recipeId with portions (a planned week = what's in state)
    const byRecipe = {};
    for (const e of model.state.planEntries) {
      if (!byRecipe[e.recipeId]) byRecipe[e.recipeId] = { portions: 0 };
      byRecipe[e.recipeId].portions += e.portions;
    }
    const weekPlan = Object.entries(byRecipe).map(([id, v]) => {
      const recipe = allRecipes.find((r) => r.id === id);
      return recipe ? { recipe, portionsPerDay: 1, days: Math.min(v.portions, 7) } : null;
    }).filter(Boolean);
    const week = A.adequacyWeek(weekPlan, comp, { sex });
    const rows = week.nutrients.map((n) => {
      const cls = n.status === 'adequate' || n.status === 'under-ceiling' ? 'text-emerald-300' : (n.status === 'inadequate-no-data' ? 'text-stone-400' : 'text-orange-300');
      const val = n.actual != null ? n.actual : '—';
      const target = n.rdaTarget != null ? n.rdaTarget : '—';
      return `<tr><td class="px-2 py-0.5">${n.id}</td><td class="px-2 py-0.5 text-right">${val}</td><td class="px-2 py-0.5 text-right">${target}</td><td class="px-2 py-0.5 ${cls}">${n.status}${n.pctOfRda != null ? ` (${n.pctOfRda}%)` : ''}</td></tr>`;
    }).join('');
    host.innerHTML = `
      <table class="w-full border border-stone-800 text-left">
        <caption class="text-left text-xs text-stone-400 px-2 pt-1">Weekly adequacy — basis: ${week.perServingBasis} (${week.RDA_SOURCE.split(';')[0]})</caption>
        <thead><tr><th class="px-2 py-1">Nutriente</th><th class="px-2 py-1 text-right">Semana</th><th class="px-2 py-1 text-right">RDA ×7</th><th class="px-2 py-1">Estado</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${week.missingRows > 0 ? `<p class="mt-1 text-orange-300 text-xs">⚠ ${week.missingRows} ingredient row(s) without composition — coverage is partial</p>` : ''}`;
  }

  return { init, renderEntries, entryAction, weekdayIndexOf };
});
