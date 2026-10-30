/*
 * P3.2 — Shopping list UI (canonical engine, DEVELOPMENT PREVIEW).
 * Plain DOM (deliberately not Alpine-bound to avoid two state systems), UMD.
 * Everything rendered here derives from: ImportWeighed (P1.2) → ShoppingCore
 * (P3.1) → StoreMatches fixture (P3.3), persisted via StorageCore (P2.3).
 *
 * A11y floor: real <label>s, focus-visible outlines (site CSS), buttons that do
 * exactly what their text says, aria-live status region.
 * Development preview: es-PE names show the EN label with an "(EN provisional)"
 * tag while the ingredient manifest nameProvisional flag is true — never
 * silently presented as Spanish.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ShoppingUI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function cli() {
    return {
      Q: root.Quantity, S: root.DomainSchema, C: root.CalendarCore,
      SHOP: root.ShoppingCore, ST: root.StorageCore, IM: root.ImportWeighed, SM: root.StoreMatches,
      F: root.FoodNamesEsPe,
    };
  }

  function dependenciesReady(c) { return c.Q && c.S && c.C && c.SHOP && c.ST && c.IM && c.SM && c.F; }

  function init(opts) {
    const c = cli();
    if (!dependenciesReady(c)) throw new Error('ShoppingUI dependencies missing');
    const fed = opts.fed || root.GOURMET_NUTRITION_DATA;
    if (!fed) throw new Error('nutrition data not present');
    const dom = opts.dom || document;
    const section = dom.getElementById('shopengine');
    if (!section) return { mounted: false };
    const model = hydrate(c, fed);
    buildStaticSkeleton(section);
    bind(c, model, section);
    render(c, model, section, { silent: false });
    return { mounted: true };
  }

  function localStore() {
    return {
      getItem: (k) => root.localStorage.getItem(k),
      setItem: (k, v) => root.localStorage.setItem(k, v),
      removeItem: (k) => root.localStorage.removeItem(k),
    };
  }

  function hydrate(c, fed) {
    const load = c.ST.load(localStore());
    const imported = c.IM.importWeighed(fed.curatedRecipes);
    return {
      state: load.state,
      recipes: imported.recipes,
      ingredientById: new Map(imported.ingredients.map((i) => [i.id, i])),
      catalog: root.LIMA_STORES_FIXTURE || [],
    };
  }

  function buildStaticSkeleton(section) {
    if (section.dataset.built === '1') return;
    section.dataset.built = '1';
    section.innerHTML = `
      <h2 id="shopengine-h2" class="text-xl font-bold text-amber-200">Shopping list — canonical engine (development preview)</h2>
      <p class="text-sm text-stone-300">Exact-rational quantities from your plan; every store row is <em>not checked</em> (no stock or price claims). Grouped by food family; es-PE names shown with draft tag pending native review.</p>
      <form id="engine-plan-form" class="flex flex-wrap gap-3 items-end">
        <label class="text-sm">Recipe
          <select id="engine-recipe" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></select></label>
        <label class="text-sm">Date
          <input id="engine-date" type="date" required class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <label class="text-sm">Portions
          <input id="engine-portions" type="number" min="1" value="4" class="bg-stone-800 border border-stone-600 rounded px-2 py-1 w-20"></label>
        <button type="submit" class="bg-amber-400 text-stone-950 font-bold rounded px-3 py-1 focus:outline-none focus:ring-2">Add plan entry</button>
      </form>
      <div class="flex flex-wrap gap-3 items-end mt-3">
        <label class="text-sm">From <input id="engine-from" type="date" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <label class="text-sm">To <input id="engine-to" type="date" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <button id="engine-copy" class="rounded border border-amber-300 px-3 py-1 text-amber-200 focus:outline-none focus:ring-2">Copy CSV</button>
        <button id="engine-print" class="rounded border border-amber-300 px-3 py-1 text-amber-200 focus:outline-none focus:ring-2">Print list</button>
      </div>
      <div id="engine-status" role="status" aria-live="polite" class="mt-2 text-xs text-amber-100/80"></div>
      <div id="engine-warnings" class="mt-3 text-xs text-stone-300"></div>
      <div id="engine-groups" class="mt-4 grid gap-4"></div>
      <p class="mt-4 text-xs text-stone-400">Store data: structure fixture only — titles/prices/stock pending real verification.</p>
    `;
    injectPrintStyles();
  }

  /** Print: only the shopper list section ships to paper, grouped bullets intact. */
  function injectPrintStyles() {
    if (root.__pgkPrintStyle) return;
    root.__pgkPrintStyle = true;
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        aside, nav, form, #engine-plan-form, #engine-copy, #engine-print,
        #engine-status, #engine-warnings, .no-print { display: none !important; }
        body { background: #fff !important; color: #111 !important; }
        #shopengine, #shopengine * {
          color: #111 !important; text-shadow: none !important;
        }
        #shopengine h2, #shopengine h3 { border-bottom: 1px solid #999; }
        #shopengine::before {
          content: 'Lista de compras (es-PE borrador) — no implica verificación de tienda';
          display: block; font-size: 11px; margin-bottom: 6px;
        }
      }`;
    document.head.appendChild(style);
  }

  function readDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function bind(c, model, section) {
    const form = section.querySelector('#engine-plan-form');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const entry = {
        id: `p${Date.now().toString(36)}`,
        localDate: form.querySelector('#engine-date').value,
        slot: 'dinner',
        recipeId: form.querySelector('#engine-recipe').value,
        version: 1,
        portions: Number(form.querySelector('#engine-portions').value),
        repeatRuleId: null, pantryOverride: null,
      };
      const res = c.ST.addPlanEntry(model.state, entry);
      const status = section.querySelector('#engine-status');
      if (!res.ok) {
        status.textContent = `Refused: ${res.errors.map((e) => e.code).join(', ')}`;
        section.querySelector('#engine-groups').innerHTML = '';
        return;
      }
      status.textContent = `Added ${entry.recipeId} × ${entry.portions} on ${entry.localDate}`;
      c.ST.save(model.state, localStore());
      render(c, model, section, { silent: true });
    });
    section.querySelector('#engine-copy').addEventListener('click', () => copyCsv(model, section));
    section.querySelector('#engine-print').addEventListener('click', () => root.print());
    for (const input of ['#engine-from', '#engine-to']) {
      section.querySelector(input).addEventListener('change', () => render(c, model, section, { silent: true }));
    }
  }

  function dateDefaults(c, section) {
    if (section.querySelector('#engine-from').value && section.querySelector('#engine-to').value) return;
    const week = c.ST.resolveWeek(readDate(), 'upcoming-week');
    section.querySelector('#engine-from').value = week.mondayToSunday[0];
    section.querySelector('#engine-to').value = week.mondayToSunday[6];
  }

  function buildList(c, model, section) {
    return c.SHOP.buildShoppingList({
      recipes: model.recipes,
      planEntries: model.state.planEntries,
      from: section.querySelector('#engine-from').value,
      to: section.querySelector('#engine-to').value,
      pantry: model.state.pantry,
      packages: c.SM.verifiedPackages(model.catalog),
    });
  }

  const FAMILY_LABELS = {
    proteins: 'Proteins / Proteínas',
    grains: 'Grains and cereals / Granos y cereales',
    vegetables: 'Vegetables / Verduras',
    dairy: 'Dairy / Lácteos',
    condiments: 'Condiments / Aliños',
    pantrystaples: 'Pantry / Despensa',
    'provisional-names': 'Provisional names / Nombres provisionales (pending es-PE)',
  };

  function render(c, model, section, opts) {
    const form = section.querySelector('#engine-plan-form');
    if (!form.dataset.recipesReady) {
      const select = form.querySelector('#engine-recipe');
      select.innerHTML = model.recipes.map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)}</option>`).join('');
      form.dataset.recipesReady = '1';
    }
    dateDefaults(c, section);
    const out = buildList(c, model, section);
    renderGroups(section, out, model);
    renderWarnings(section, out);
    root.__pgkLastList = out; // copy/print source of truth
    if (!opts.silent) section.querySelector('#engine-status').textContent = 'Engine ready';
  }

  function renderGroups(section, out, model) {
    const groupsEl = section.querySelector('#engine-groups');
    if (out.refused) {
      groupsEl.innerHTML = `<p class="text-red-300">Refused: ${escapeHtml(out.errors[0].code)}</p>`;
      return;
    }
    const groups = new Map();
    for (const line of out.lines) {
      const ing = model.ingredientById.get(line.ingredientId)
        || { family: 'pantrystaples', name: { en: line.ingredientId }, nameProvisional: true };
      const fam = ing.nameProvisional ? 'provisional-names' : (ing.family || 'pantrystaples');
      const shopperName = root.FoodNamesEsPe.nameBilingual(line.ingredientId, ing.name.en);
      const nameHtml = shopperName.es
        ? `${escapeHtml(shopperName.es)} <span class="text-[10px] text-stone-400">(es-PE borrador)</span>`
        : `${escapeHtml(ing.name.en)}${ing.nameProvisional ? ' (EN provisional)' : ''}`;
      const buyText = line.purchaseRecommendation
        ? `buy <strong>${line.purchaseRecommendation.packages}</strong> × ${escapeHtml(line.purchaseRecommendation.unit)}`
        : 'package decision pending';
      const pantryText = line.pantry && !isZeroRational(line.pantry)
        ? ` (pantry covers ${escapeHtml(root.ShoppingCore.rationalToString(line.pantry))})` : '';
      groups.set(fam, (groups.get(fam) || []).concat([`
        <li class="flex flex-wrap items-center gap-2">
          <input type="checkbox" data-line="${escapeHtml(line.ingredientId)}" aria-label="bought ${escapeHtml(line.ingredientId)}">
          <span class="text-stone-200">${nameHtml}</span>
          <span class="text-amber-200">need ${escapeHtml(line.neededString)} ${escapeHtml(line.unit)}</span>
          <span class="text-emerald-300">${pantryText} ${buyText}</span>
        </li>`]));
    }
    groupsEl.innerHTML = [...groups.entries()].map(([fam, items]) => `
      <div>
        <h3 class="font-bold text-amber-300">${escapeHtml(FAMILY_LABELS[fam] || fam)}</h3>
        <ul class="list-disc pl-6 space-y-1">${items.join('')}</ul>
      </div>`).join('') || '<p class="text-stone-400">(no plan entries in range)</p>';
  }

  function isZeroRational(q) { return q.num === 0; }

  function renderWarnings(section, out) {
    const counts = {};
    for (const w of out.warnings) counts[w.code] = (counts[w.code] || 0) + 1;
    section.querySelector('#engine-warnings').innerHTML = Object.entries(counts)
      .map(([code, n]) => `<span class="mr-3">⚠ ${escapeHtml(code)} ×${n}</span>`).join('')
      || '<span>(no warnings)</span>';
  }

  async function copyCsv(model, section) {
    const out = root.__pgkLastList;
    const status = section.querySelector('#engine-status');
    if (!out || !out.lines.length) { status.textContent = 'Nothing to copy yet'; return; }
    const csv = listToCsv(out, model);
    try {
      await root.navigator.clipboard.writeText(csv);
      status.textContent = 'CSV copied to clipboard';
    } catch {
      status.textContent = 'Clipboard unavailable — CSV placed on the Copy button data attribute';
      section.querySelector('#engine-copy').setAttribute('data-csv', csv);
    }
  }

  function listToCsv(out, model) {
    const header = 'family,ingredient,es_pe_name,basis,unit,needed,net_required,purchase_packages,package_unit,rule,source_entries';
    const rows = out.lines.map((l) => {
      const ing = model.ingredientById.get(l.ingredientId) || {};
      const esName = root.FoodNamesEsPe.nameForIngredient(l.ingredientId) || '';
      const rec = l.purchaseRecommendation;
      const recPart = rec ? `${rec.packages},${rec.unit},${rec.rule}` : 'none,-,needs_package_decision';
      return [ing.family || '', l.ingredientId, esName, l.basis, l.unit, l.neededString, l.netRequiredString, recPart, l.sourcePlanEntryIds.join('|')]
        .map(csvCell).join(',');
    });
    return [header].concat(rows).join('\n');
  }
  function csvCell(v) {
    const s = String(v ?? '');
    return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  return { init, hydrate, listToCsv, escapeHtml, renderGroups };
});
