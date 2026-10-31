/*
 * LEDGER-2 UI — P4.4 kitchen weigh-in worksheet (vanilla DOM, UMD).
 * Section #weighin: recipe select (weighed-7 + docx ⭐), per-ingredient
 * actual-grams inputs prefilled from planned grams, yield input, submit →
 * WeighInCore.evaluateWeighIn → StorageCore state.kitchenWeighIns (persisted) →
 * the cook-mode nutrition card can promote to 'weighed-pending-review'.
 * Browser only (window.WeighInUI). CC ≤ 12 per function.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WeighInUI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function plannedGrams(use) {
    const q = parseFloat(use.quantity);
    if (!Number.isFinite(q)) return null;
    const map = { g: 1, kg: 1000, ml: 1, l: 1000 };
    if (map[use.unit] != null) return q * map[use.unit];
    if (use.unit === 'count') return q * (use.ingredientId === 'clara_huevo' ? 33 : 55);
    return null;
  }

  function init(opts) {
    const dom = opts.dom || document;
    const section = dom.getElementById('weighin');
    if (!section || !opts.model) return { mounted: false };
    buildStaticSkeleton(section);
    bind(section, opts.model);
    fillRecipe(section, opts.model);
    renderExisting(section, opts.model);
    return { mounted: true };
  }

  function buildStaticSkeleton(section) {
    if (section.dataset.built === '1') return;
    section.dataset.built = '1';
    section.innerHTML = `
      <h2 id="weighin-h2" class="text-xl font-bold text-amber-200">${root.I18N ? root.I18N.t('weighin.title') : 'Weigh-in worksheet'}</h2>
      <p class="text-sm text-stone-300">${root.I18N ? root.I18N.t('weighin.note') : 'Weigh each ingredient on a scale during your cook; the per-serving macros promote to weighed status. Kitchen half only — the dual review is separate.'}</p>
      <div class="flex flex-wrap items-end gap-3 mt-2">
        <label class="text-sm">${root.I18N ? root.I18N.t('weighin.recipeLabel') : 'Recipe'}
          <select id="weighin-recipe" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></select></label>
        <label class="text-sm">Rendimiento (g cocido)
          <input id="weighin-yield" type="number" min="1" placeholder="g" class="bg-stone-800 border border-stone-600 rounded px-2 py-1 w-24"></label>
        <button id="weighin-submit" class="rounded bg-amber-400 text-stone-950 font-bold px-3 py-1 focus:outline-none focus:ring-2">${root.I18N ? root.I18N.t('weighin.submit') : 'Registrar pesa'}</button>
      </div>
      <div id="weighin-status" role="status" aria-live="polite" class="mt-2 text-xs text-amber-100/80"></div>
      <div id="weighin-fields" class="mt-3 grid gap-1"></div>
      <div id="weighin-history" class="mt-3 text-xs text-stone-400"></div>
    `;
  }

  function fillRecipe(section, model) {
    const sel = section.querySelector('#weighin-recipe');
    const all = [...(model.recipes || []), ...(model.docxRecipes || [])];
    sel.innerHTML = all.map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)}${r.sourceFamily === 'owner-docx' ? ' ⭐' : ''}</option>`).join('');
    sel.addEventListener('change', () => renderFields(section, model));
    renderFields(section, model);
  }

  function renderFields(section, model) {
    const id = section.querySelector('#weighin-recipe').value;
    const recipe = [...(model.recipes || []), ...(model.docxRecipes || [])].find((r) => r.id === id);
    const host = section.querySelector('#weighin-fields');
    if (!recipe) { host.innerHTML = ''; return; }
    host.innerHTML = recipe.ingredients.map((u) => {
      const planned = plannedGrams(u);
      return `<label class="flex items-center gap-2 text-sm">${escapeHtml(u.ingredientId)} <span class="text-stone-500 text-xs">(planeado ${planned == null ? '—' : planned + ' g'})</span>
        <input type="number" step="0.1" min="0" data-w="${escapeHtml(u.ingredientId)}" placeholder="g real" class="bg-stone-800 border border-stone-600 rounded px-2 py-0.5 w-24 text-right" ${u.optional ? 'data-optional="1"' : ''}></label>`;
    }).join('');
  }

  function bind(section, model) {
    section.querySelector('#weighin-submit').addEventListener('click', () => submit(section, model));
  }

  function submit(section, model) {
    const W = root.WeighInCore;
    const id = section.querySelector('#weighin-recipe').value;
    const recipe = [...(model.recipes || []), ...(model.docxRecipes || [])].find((r) => r.id === id);
    const status = section.querySelector('#weighin-status');
    if (!W || !recipe) { status.textContent = 'engine missing'; return; }
    const weighIns = {};
    section.querySelectorAll('#weighin-fields input[data-w]').forEach((inp) => {
      const v = parseFloat(inp.value);
      if (Number.isFinite(v)) weighIn_Set(weighIns, inp.dataset.w, v);
    });
    const yieldG = parseFloat(section.querySelector('#weighin-yield').value);
    const result = W.evaluateWeighIn(recipe, { weighIns, yieldG: Number.isFinite(yieldG) ? yieldG : null });
    if (!model.state.kitchenWeighIns) model.state.kitchenWeighIns = {};
    model.state.kitchenWeighIns[id] = { at: new Date().toISOString(), result };
    root.StorageCore.save(model.state, {
      getItem: (k) => root.localStorage.getItem(k), setItem: (k, v) => root.localStorage.setItem(k, v), removeItem: (k) => root.localStorage.removeItem(k),
    });
    status.textContent = result.status === 'weighed-pending-review'
      ? `✓ ${id}: varianza ${result.variancePct}% — weighed-pending-review (dual review pendiente)`
      : `✗ ${result.status}: faltan ${result.missing.join(', ')}`;
    renderExisting(section, model);
    void status;
  }

  function weighIn_Set(obj, k, v) { obj[k] = v; }

  function renderExisting(section, model) {
    const host = section.querySelector('#weighin-history');
    const saved = (model.state.kitchenWeighIns || {});
    const keys = Object.keys(saved);
    host.innerHTML = keys.length
      ? `Pesadas registradas: ${keys.map((k) => `${escapeHtml(k)} (${saved[k].result.status})`).join(', ')}`
      : '(sin pesadas registradas aún — tu sesión de cocina cierra LEDGER-2)';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  return { init, plannedGrams };
});
