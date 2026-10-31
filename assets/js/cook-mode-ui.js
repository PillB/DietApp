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
    cookDate.addEventListener('change', () => renderLeftovers(section, opts));
    section.querySelector('#cook-leftovers').addEventListener('click', () => renderLeftovers(section, opts));
    render();
    return { mounted: true };
  }

  function buildStaticSkeleton(section) {
    if (section.dataset.built === '1') return;
    section.dataset.built = '1';
    section.innerHTML = `
      <h2 class="text-xl font-bold text-amber-200">Cook mode (development preview)</h2>
      <p class="text-sm text-stone-300">Step cards with gate verdicts. Temperature claims are extracted from prose (unverified); food-type is inferred and labeled; thermometer checkpoints are required for protein steps before anything is EVER 'validated'.</p>
      <div class="flex flex-wrap items-end gap-3 mt-2">
        <label class="text-sm">Recipe <select id="cook-recipe" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></select></label>
        <label class="text-sm">Cooked on <input id="cook-date" type="date" class="bg-stone-800 border border-stone-600 rounded px-2 py-1"></label>
        <button id="cook-leftovers" class="rounded border border-amber-300 px-3 py-1 text-amber-200 focus:outline-none focus:ring-2">Leftover status</button>
      </div>
      <div id="cook-badge" class="mt-2 text-sm"></div>
      <div id="cook-diagram" class="mt-3"></div>
      <ol id="cook-steps" class="mt-3 space-y-2"></ol>
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
      return `<li class="rounded border border-stone-700 px-3 py-2">
        <span class="text-stone-200">Step ${i + 1}${s.station ? ` (${escapeHtml(s.station)})` : ''}:</span> <span class="text-stone-300">${escapeHtml(s.text.en)}</span>
        <span class="block mt-1 text-emerald-200/80 text-xs">ES-PE: ${escapeHtml(s.esPE || '(missing)')}</span>
        ${verdictHtml}${miseLine}
      </li>`;
    }).join('');
    renderDiagram(section, recipe);
    const review = COOK.reviewGateForPublication(recipe);
    section.querySelector('#cook-review-status').innerHTML = review.readyForPublication
      ? '<span class="text-emerald-300">dual review complete</span>'
      : `<span class="text-red-300">not ready for publication: pending dual review (${review.missing.filter((m) => m.field === 'approval').length} approvals, ${review.missing.filter((m) => m.field !== 'approval').length} fields)</span>`;
    renderLeftovers(section);
  }

  /** Cooking-for-Engineers style diagram: stations across columns, ordered
   * operations down rows, ingredient tokens inside cells. A <table> keeps it
   * screen-reader-native (caption + th scope). */
  function renderDiagram(section, recipe) {
    const host = section.querySelector('#cook-diagram');
    if (!recipe.diagram) { host.innerHTML = '<p class="text-xs text-stone-500">(no diagram data for this recipe yet)</p>'; return; }
    const d = recipe.diagram;
    const head = `<caption class="text-left text-xs text-stone-400 px-2 pt-2">Diagram — ${escapeHtml(d.style)}; ingredient flow left-to-right per station</caption>
      <thead><tr><th scope="col" class="px-2 py-1 text-left text-xs text-amber-300/80">Operation ↑ / Station →</th>${d.columns.map((c) => `<th scope="col" class="px-2 py-1 text-left text-xs text-amber-300/80">${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
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
