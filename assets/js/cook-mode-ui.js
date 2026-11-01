/*
 * P4.1 — Cook-mode UI (DEVELOPMENT PREVIEW): step cards over the imported
 * (schema-valid) recipes with the P4 gates wired. Every displayed knowledge
 * keeps its provenance label: temps extracted from prose are CLAIMS
 * (unverified), foodType is inferred (labeled), the recipe badge states
 * "unvalidated pressure" unless the P4.2 gate passes (it never does yet).
 * Leftovers advice uses the USDA builder. Nothing here ever says "validated".
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CookModeUI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function tC(key, map) {
    let s = root.I18N ? root.I18N.t(key) : key;
    if (map) for (const [k, v] of Object.entries(map)) s = s.replaceAll(`{${k}}`, v);
    return s;
  }

  function init(opts) {
    const dom = opts.dom || document;
    const section = dom.getElementById('cookmode');
    if (!section || !opts.model) return { mounted: false };
    buildStaticSkeleton(section);
    if (root.DOCX_DIET_RECIPES) {
      opts.model.docxRecipes = root.DOCX_DIET_RECIPES.recipes.map((r) => ({
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
    const allRecipes = () => [...opts.model.recipes, ...(opts.model.docxRecipes || [])];
    const select = section.querySelector('#cook-recipe');
    select.innerHTML = allRecipes().map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)}${r.sourceFamily === 'owner-docx' ? ' ⭐' : ''}</option>`).join('');
    const render = () => renderRecipe(section, opts.model);
    select.addEventListener('change', render);
    const cookDate = section.querySelector('#cook-date');
    cookDate.addEventListener('change', () => renderLeftovers(section));
    section.querySelector('#cook-leftovers').addEventListener('click', () => renderLeftovers(section));
    if (root.I18N) root.I18N.onChange(() => {
      section.dataset.built = '0';
      buildStaticSkeleton(section);
      rebindCook(section, opts);
      renderRecipe(section, opts.model);
    });
    rebindCook(section, opts);
    render();
    return { mounted: true };
  }

  function rebindCook(section, opts) {
    const select = section.querySelector('#cook-recipe');
    select.innerHTML = [...opts.model.recipes, ...(opts.model.docxRecipes || [])]
      .map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)}${r.sourceFamily === 'owner-docx' ? ' ⭐' : ''}</option>`).join('');
    select.addEventListener('change', () => renderRecipe(section, opts.model));
    const cookDate = section.querySelector('#cook-date');
    cookDate.addEventListener('change', () => renderLeftovers(section));
    section.querySelector('#cook-leftovers').addEventListener('click', () => renderLeftovers(section));
  }

  function buildStaticSkeleton(section) {
    if (section.dataset.built === '1') return;
    section.dataset.built = '1';
    section.innerHTML = `
      <h2 class="text-xl font-bold text-amber-200">${tC("cookmode.title")}</h2>
      <p class="text-sm text-stone-300">${tC("cookmode.subtitle")}</p>
      <div class="flex flex-wrap items-end gap-3 mt-2">
        <label class="text-sm">${tC("cookmode.recipeLabel")} <select id="cook-recipe" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></select></label>
        <label class="text-sm">${tC("cookmode.cookedOn")} <input id="cook-date" type="date" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <button id="cook-leftovers" class="rounded border border-amber-300 px-3 py-1 text-amber-200 focus:outline-none focus:ring-2">${tC("cookmode.leftoverStatus")}</button>
      </div>
      <div id="cook-badge" class="mt-2 text-sm"></div>
      <div id="cook-diagram" class="mt-3"></div>
      <ol id="cook-steps" class="mt-3 space-y-2"></ol>
      <div id="cook-nutrition" class="mt-3"></div>
      <div id="cook-leftover-result" class="mt-3 text-xs text-stone-300"></div>
      <div id="cook-review-status" class="mt-3 text-xs"></div>
    `;
  }

  function renderRecipe(section, model) {
    const id = section.querySelector('#cook-recipe').value;
    const recipe = [...model.recipes, ...(model.docxRecipes || [])].find((r) => r.id === id);
    if (!recipe) return;
    const COOK = root.CookingCore;
    // protein classes from canonical ingredient ids — conservative, labeled inferred
    const ids = recipe.ingredients.map((u) => u.ingredientId);
    const inferred = COOK.inferFoodType(ids);
    const badge = COOK.modeBadge({ times: recipe.times, equipment: recipe.equipment });
    section.querySelector('#cook-badge').innerHTML = `
      <span class="rounded-xl border px-3 py-1 ${badge.mode.startsWith('pressure') ? 'border-orange-400 text-orange-300' : 'border-stone-500 text-stone-300'}">🧭 ${escapeHtml(badge.badgeText)}</span>
      ${inferred ? `<span class="ml-2 rounded-xl border border-stone-500 px-3 py-1 text-stone-300">classified ${escapeHtml(inferred.foodType)} (inferred — needs ${escapeHtml(inferred.needs)})</span>` : ''}`;
    const stepsEl = section.querySelector('#cook-steps');
    const claims = COOK.extractHeatClaims(recipe.steps.map((s) => s.text.en));
    const proteinIds = ids.filter((x) => ['salmon', 'chicken_breast', 'beef_sirloin', 'beef_chuck'].includes(x));
    // W5b PR-2: adapter is the single read-path — compute once per recipe
    const canonSteps = root.StepText ? root.StepText.stepTextsOf(recipe, { translations: root.__pgkStepTranslations || {} }) : [];
    stepsEl.innerHTML = recipe.steps.map((s, i) => {
      const claim = claims[i];
      let verdictHtml = '<span class="text-stone-400">no heat gate (no temperature claim; no protein)</span>';
      if (claim && inferred) {
        const v = COOK.stepVerdict(claim, inferred);
        const color = v.gate.startsWith('fails') ? 'text-red-300' : 'text-amber-200';
        verdictHtml += `<span class="ml-2 ${color}">claim ${claim.tempC}°C (unverified) — gate: ${escapeHtml(v.gate)}; requires: ${v.requires.map(escapeHtml).join(', ')}</span>`;
      } else if (claim && !inferred) {
        verdictHtml += `<span class="ml-2 text-stone-400">claim ${claim.tempC}°C (unverified) — no protein classification (neutral food). Gate: food-safety classification required.</span>`;
      }
      verdictHtml += '</span>';
      void proteinIds;
      const miseLine = recipe.mise_en_place && recipe.mise_en_place.some((m) => (s.station || '').startsWith(m.station.split(' - ')[0]))
        ? '' : '<span class="ml-2 text-red-300 translate-y-0.5">(no mise line!)</span>';
      // adapter is the single read-path (esStatus policy decided at render)
      const es = canonSteps[i] ? canonSteps[i].text : { esPE: '', esStatus: 'none' };
      const tag = es.esStatus === 'draft' ? ' (es-PE borrador)' : '';
      const esHtml = es.esPE
        ? `<span class="block mt-1 text-emerald-200/80 text-xs">ES-PE: ${escapeHtml(es.esPE)}${escapeHtml(tag)}</span>`
        : '<span class="block mt-1 text-red-300/70 text-xs">ES-PE: (missing)</span>';
      return `<li class="rounded border border-stone-700 px-3 py-2">
        <span class="text-stone-200">Step ${i + 1}${s.station ? ` (${escapeHtml(s.station)})` : ''}:</span> <span class="text-stone-300">${escapeHtml(s.text.en)}</span>
        ${esHtml}
        ${verdictHtml}${miseLine}
      </li>`;
    }).join('');
    renderDiagram(section, recipe);
    const review = COOK.reviewGateForPublication(recipe);
    section.querySelector('#cook-review-status').innerHTML = review.readyForPublication
      ? '<span class="text-emerald-300">dual review complete</span>'
      : `<span class="text-red-300">not ready for publication: pending dual review (${review.missing.filter((m) => m.field === 'approval').length} approvals, ${review.missing.filter((m) => m.field !== 'approval').length} fields)</span>`;
    renderNutritionCard(section, recipe);
    renderLeftovers(section);
  }

  /** Micros line: shown only when vitamin A was computable (all-composed proxy). */
  function microsLine(per) {
    if (per.vitaminAUg == null) return '';
    return `<span class="block mt-1 text-xs text-stone-400">Micros: Vit A ${per.vitaminAUg} µg · Vit C ${per.vitaminCMg} mg · folato ${per.folateUg} µg · Ca ${per.calciumMg} mg · Fe ${per.ironMg} mg · Zn ${per.zincMg} mg · Na ${per.sodiumMg} mg</span>`;
  }

  /** Computed-pending-weighin per-serving macros; honest zero-field when compositions missing */
  function renderNutritionCard(section, recipe) {
    const host = section.querySelector('#cook-nutrition');
    if (!host) return;
    const NUTRITION = root.DietNutritionCore;
    if (!NUTRITION) { host.innerHTML = '<p class="text-xs text-stone-500">(composition engine not loaded)</p>'; return; }
    const comp = {};
    const pendingNames = [];
    const bridge = root.CompositionBridge;
    for (const u of recipe.ingredients) {
      if (root.__pgkComposition && root.__pgkComposition[u.ingredientId]) {
        comp[u.ingredientId] = root.__pgkComposition[u.ingredientId];
      } else if (bridge) {
        const resolved = bridge.applyBridge(root.__pgkComposition || {}, u.ingredientId);
        if (resolved && resolved.per100g) { comp[u.ingredientId] = resolved; }
        else { pendingNames.push(u.ingredientId); }
      } else {
        pendingNames.push(u.ingredientId);
      }
    }
    const per = NUTRITION.computedPerServing(recipe, comp);
    host.innerHTML = `
      <div class="rounded border border-stone-700 px-3 py-2 text-sm">
        <span class="text-amber-300">${tC('nutrition.perServing')}</span>
        <span class="text-stone-200">${per.kcal == null ? '—' : per.kcal + ' kcal'} · ${per.proteinG == null ? '—' : per.proteinG + ' ' + tC('nutrition.proteinG')} · ${per.fiberG == null ? '—' : per.fiberG + ' ' + tC('nutrition.fiberG')}</span>
        ${per.missingRows > 0 ? `<span class="ml-2 text-orange-300">⚠ ${per.missingRows} ${tC("nutrition.missingRows")} — macros pendiente</span>` : `<span class="ml-2 text-emerald-300/80">${tC('nutrition.allComposed')}</span>`}
        ${pendingNames.length ? `<span class="ml-2 text-stone-400 text-xs">${tC('nutrition.missing', { list: pendingNames.map((p) => escapeHtml(p)).join(', ') })}</span>` : ''}
        <span class="block text-xs text-stone-500">${tC('nutrition.tpcaNote')}</span>
        ${microsLine(per)}
      </div>`;
  }

  /** Cooking-for-Engineers style diagram: stations across columns, ordered
   * operations down rows, ingredient tokens inside cells. A <table> keeps it
   * screen-reader-native (caption + th scope). */
  function renderDiagram(section, recipe) {
    const host = section.querySelector('#cook-diagram');
    if (!recipe.diagram) { host.innerHTML = `<p class="text-xs text-stone-500">${tC('cook.noDiagram')}</p>`; return; }
    const d = recipe.diagram;
    const head = `<caption class="text-left text-xs text-stone-400 px-2 pt-2">${tC('cook.diagramCaption', { style: escapeHtml(d.style) })}</caption>
      <thead><tr><th scope="col" class="px-2 py-1 text-left text-xs text-amber-300/80">${tC('cook.stationAxis')}</th>${d.columns.map((c) => `<th scope="col" class="px-2 py-1 text-left text-xs text-amber-300/80">${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
    const body = d.rows.map((row) => {
      const cells = d.columns.map((_, idx) => idx === row.stationIdx
        ? `<td class="px-2 py-1 align-top text-xs text-stone-200">${row.tokens.filter(Boolean).map(escapeHtml).join(' + ')}<span class="block text-stone-400">${row.timeMin ? `${row.timeMin} min` : ''}${row.tempC != null ? ` · ${escapeHtml(String(row.tempC))}°C` : ''}</span></td>`
        : '<td class="px-2 py-1"></td>').join('');
      return `<tr class="border-t border-stone-800"><th scope="row" class="px-2 py-1 text-left align-top text-xs text-stone-300 font-normal">${escapeHtml(row.label)}</th>${cells}</tr>`;
    }).join('');
    host.innerHTML = `<table id="cook-diagram-table" class="w-full border border-stone-800 rounded-lg text-left">${head}<tbody>${body}</tbody></table>
      <p class="mt-1 text-xs text-stone-500">station columns left→right; each row is a fold of its tokens; anything listed once must be consumed by the END of that row (ledger L5 checked).</p>`;
  }

  function renderLeftovers(section) {
    const COOK = root.CookingCore;
    const dateVal = section.querySelector('#cook-date').value || todayLocal();
    const advice = COOK.leftoverAdvice({ cookedOnIso: dateVal, nowIso: todayLocal() });
    section.querySelector('#cook-leftover-result').innerHTML =
      `<strong>${escapeHtml(advice.status)}</strong> — ${escapeHtml(advice.text)}`;
  }

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  return { init, renderRecipe, escapeHtml };
});
