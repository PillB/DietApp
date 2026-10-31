/*
 * P3.2 — Shopping list UI (canonical engine, DEVELOPMENT PREVIEW).
 * Plain DOM (deliberately not Alpine-bound to avoid two state systems), UMD.
 * Everything rendered here derives from: ImportWeighed (P1.2) → ShoppingCore
 * (P3.1) → StoreMatches fixture (P3.3), persisted via StorageCore (P2.3).
 *
 * A11y floor: real <label>s, focus-visible outlines (site CSS), buttons that do
 * exactly what their text says, aria-live status region.
 * Development preview: es-PE names show the EN label with an "${tr('shopping.uiEnProvisional')}"
 * tag while the ingredient manifest nameProvisional flag is true — never
 * silently presented as Spanish.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ShoppingUI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function tr(key, replacements) {
    let text = root.I18N ? root.I18N.t(key) : key;
    for (const [name, value] of Object.entries(replacements || {})) {
      text = text.replaceAll('{' + name + '}', String(value));
    }
    return text;
  }

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
    if (!section) return { mounted: false, model: null };
    const model = hydrate(c, fed);
    if (root.DOCX_DIET_RECIPES) {
      model.docxRecipes = root.DOCX_DIET_RECIPES.recipes.map((r) => ({
        ...r.meta,
        equipment: (r.meta.equipment || []).map((e) => String(e).split('|')[0]),
        ingredients: r.ingredients,
        steps: r.steps,
        flavorTags: r.meta.flavorTags || [],
        diagram: r.diagram,
        mise_en_place: r.mise_en_place,
        allergens: r.allergens,
        sourceFamily: 'owner-docx',
      }));
    }
    buildStaticSkeleton(section);
    bind(c, model, section);
    render(c, model, section, { silent: false });
    root.__pgkRefreshShopping = () => render(c, model, section, { silent: true });
    if (root.I18N) root.I18N.onChange(() => {
      section.dataset.built = '0';
      buildStaticSkeleton(section);
      bind(c, model, section);
      section.querySelector('#engine-plan-form').dataset.recipesReady = '0';
      render(c, model, section, { silent: true });
    });
    return { mounted: true, model };
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
    const t = (k) => (root.I18N ? root.I18N.t(k) : null);
    section.innerHTML = `
      <h2 id="shopengine-h2" class="text-xl font-bold text-amber-200">${t('shopping.title')}</h2>
      <p class="text-sm text-stone-300">${t('shopping.note')}</p>
      <form id="engine-plan-form" class="flex flex-wrap gap-3 items-end">
        <label class="text-sm">${t('shopping.recipe')}
          <select id="engine-recipe" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></select></label>
        <label class="text-sm">${tr('shopping.date')}
          <input id="engine-date" type="date" required class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <label class="text-sm">${t('shopping.portions')}
          <input id="engine-portions" type="number" min="1" value="4" class="bg-stone-800 border border-stone-600 rounded px-2 py-1 w-20"></label>
        <button type="submit" class="bg-amber-400 text-stone-950 font-bold rounded px-3 py-1 focus:outline-none focus:ring-2">${t('shopping.addEntry')}</button>
      </form>
      <div class="flex flex-wrap gap-3 items-end mt-3">
        <label class="text-sm">${t('shopping.from')} <input id="engine-from" type="date" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <label class="text-sm">${t('shopping.to')} <input id="engine-to" type="date" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <button id="engine-copy" class="rounded border border-amber-300 px-3 py-1 text-amber-200 focus:outline-none focus:ring-2">${t('shopping.copyCsv')}</button>
        <button id="engine-print" class="rounded border border-amber-300 px-3 py-1 text-amber-200 focus:outline-none focus:ring-2">${t('shopping.printList')}</button>
      </div>
      <div id="engine-status" role="status" aria-live="polite" class="mt-2 text-xs text-amber-100/80"></div>
      <div id="engine-warnings" class="mt-3 text-xs text-stone-300"></div>
      <div id="engine-groups" class="mt-4 grid gap-4"></div>
      <p class="mt-4 text-xs text-stone-400">${tr('shopping.uiStoreFixture')}</p>
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
    // HTML5 validation blocks submit silently; surface WHY inline (a11y + UX)
    form.addEventListener('invalid', (ev) => {
      const target = ev.target;
      const status = section.querySelector('#engine-status');
      if (target.validity && target.validity.rangeUnderflow) {
        status.textContent = `${root.I18N ? root.I18N.t('planner.refused') : 'Refused:'} ${root.I18N ? root.I18N.t('shopping.portions') : 'portions'} ${target.value} < 1`;
      } else if (target.validity && target.validity.valueMissing) {
        status.textContent = `${root.I18N ? root.I18N.t('planner.refused') : 'Refused:'} ${t('shopping.date')}`;
      }
    }, true); // capture: invalid doesn't bubble
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
        status.textContent = tr('shopping.uiRefused', { reason: res.errors.map(e => e.code).join(', ') });
        section.querySelector('#engine-groups').innerHTML = '';
        return;
      }
      status.textContent = tr('shopping.uiAdded', {recipe: entry.recipeId, n: entry.portions, date: entry.localDate});
      c.ST.save(model.state, localStore());
      render(c, model, section, { silent: true });
      if (root.PlannerUI && root.__pgkRefreshPlanner) root.__pgkRefreshPlanner();
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
      recipes: [...(model.recipes || []), ...(model.docxRecipes || [])],      planEntries: model.state.planEntries,
      from: section.querySelector('#engine-from').value,
      to: section.querySelector('#engine-to').value,
      pantry: model.state.pantry,
      packages: c.SM.verifiedPackages(model.catalog),
    });
  }

  const FAMILY_LABELS = {
    proteins: 'shopping.familyProteins',
    grains: 'shopping.familyGrains',
    vegetables: 'shopping.familyVegetables',
    dairy: 'shopping.familyDairy',
    condiments: 'shopping.familyCondiments',
    pantrystaples: 'shopping.familyPantry',
    'provisional-names': 'shopping.familyProvisional',
  };

  function render(c, model, section, opts) {
    const form = section.querySelector('#engine-plan-form');
    if (form.dataset.recipesReady !== '1') {
      const select = form.querySelector('#engine-recipe');
      const allRecipes = [...(model.recipes || []), ...(model.docxRecipes || [])];
      select.innerHTML = allRecipes.map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)}${r.sourceFamily === 'owner-docx' ? ' ⭐' : ''}</option>`).join('');
      form.dataset.recipesReady = '1';
    }
    dateDefaults(c, section);
    const out = buildList(c, model, section);
    renderGroups(section, out, model);
    renderWarnings(section, out);
    root.__pgkLastList = out; // copy/print source of truth
    if (!opts.silent) section.querySelector('#engine-status').textContent = tr('shopping.uiReady');
  }

  function renderGroups(section, out, model) {
    const groupsEl = section.querySelector('#engine-groups');
    if (out.refused) {
      groupsEl.innerHTML = `<p class="text-red-300">${escapeHtml(tr('shopping.uiRefused', {reason: out.errors[0].code}))}</p>`;
      return;
    }
    const groups = new Map();
    for (const line of out.lines) {
      const ing = model.ingredientById.get(line.ingredientId)
        || { family: 'pantrystaples', name: { en: line.ingredientId }, nameProvisional: true };
      const fam = ing.nameProvisional ? 'provisional-names' : (ing.family || 'pantrystaples');
      const shopperName = root.FoodNamesEsPe.bilingual(line.ingredientId, ing.name.en);
      const synText = shopperName.syn.length ? ` (${escapeHtml(shopperName.syn.slice(0, 2).join(', '))})` : '';
      const nameHtml = shopperName.es
        ? `${escapeHtml(shopperName.es)}${synText} <span class="text-[10px] text-stone-400">${tr('shopping.uiEsDraft')}</span>`
        : `${escapeHtml(ing.name.en)}${ing.nameProvisional ? ' (EN provisional)' : ''}`;
      const buyText = line.purchaseRecommendation
        ? escapeHtml(tr('shopping.uiBuy', {n: line.purchaseRecommendation.packages, unit: line.purchaseRecommendation.unit}))
        : tr('shopping.uiPackage');
      const pantryText = line.pantry && !isZeroRational(line.pantry)
        ? ` (${escapeHtml(tr('shopping.uiPantry', {amount: root.ShoppingCore.rationalToString(line.pantry)}))})` : '';
      groups.set(fam, (groups.get(fam) || []).concat([`
        <li class="flex flex-wrap items-center gap-2">
          <input type="checkbox" data-line="${escapeHtml(line.ingredientId)}" aria-label="${escapeHtml(tr('shopping.uiBought', {name: line.ingredientId}))}">
          <span class="text-stone-200">${nameHtml}</span>
          <span class="text-amber-200">${escapeHtml(tr('shopping.uiNeed', { amount: line.neededString, unit: line.unit }))}</span>
          <span class="text-emerald-300">${pantryText} ${buyText}</span>
        </li>`]));
    }
    groupsEl.innerHTML = [...groups.entries()].map(([fam, items]) => `
      <div>
        <h3 class="font-bold text-amber-300">${escapeHtml(FAMILY_LABELS[fam] ? tr(FAMILY_LABELS[fam]) : fam)}</h3>
        <ul class="list-disc pl-6 space-y-1">${items.join('')}</ul>
      </div>`).join('') || `<p class="text-stone-400">${escapeHtml(tr('shopping.uiEmpty'))}</p>`;
  }

  function isZeroRational(q) { return q.num === 0; }

  function renderWarnings(section, out) {
    const counts = {};
    for (const w of out.warnings) counts[w.code] = (counts[w.code] || 0) + 1;
    section.querySelector('#engine-warnings').innerHTML = Object.entries(counts)
      .map(([code, n]) => `<span class="mr-3">⚠ ${escapeHtml(code === 'needs_package_decision' ? tr('shopping.uiPackage') : code)} ×${n}</span>`).join('')
      || `<span>${escapeHtml(tr('shopping.uiWarningsNone'))}</span>`;
  }

  async function copyCsv(model, section) {
    const out = root.__pgkLastList;
    const status = section.querySelector('#engine-status');
    if (!out || !out.lines.length) { status.textContent = tr('shopping.uiNothingToCopy'); return; }
    const csv = listToCsv(out, model);
    try {
      await root.navigator.clipboard.writeText(csv);
      status.textContent = tr('shopping.uiCopied');
    } catch {
      status.textContent = tr('shopping.uiClipboardFail');
      section.querySelector('#engine-copy').setAttribute('data-csv', csv);
    }
  }

  function listToCsv(out, model) {
    const header = 'family,ingredient,es_pe_name,basis,unit,needed,net_required,purchase_packages,package_unit,rule,source_entries';
    const rows = out.lines.map((l) => {
      const ing = model.ingredientById.get(l.ingredientId) || {};
      const esName = root.FoodNamesEsPe.nameForIngredient(l.ingredientId) || '';
      const syn = root.FoodNamesEsPe.synonymsFor(l.ingredientId);      const esCell = syn.length ? `${esName} (${syn.slice(0, 3).join(' | ')})` : esName;
      const rec = l.purchaseRecommendation;
      const recPart = rec ? `${rec.packages},${rec.unit},${rec.rule}` : 'none,-,needs_package_decision';
      return [ing.family || '', l.ingredientId, esCell, l.basis, l.unit, l.neededString, l.netRequiredString, recPart, l.sourcePlanEntryIds.join('|')]
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
