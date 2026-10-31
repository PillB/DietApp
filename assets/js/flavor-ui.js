/*
 * P5.3 — Flavor atlas UI (DEVELOPMENT PREVIEW).
 * Data enters ONLY via owner-uploaded atlas JSON (file input) — the published
 * site never embeds purchase-derived data; the dev server already 403s context/*.
 * Rendering contract (roadmap P5.3):
 *  - visual: deterministic SVG bar chart (no library, no force layouts);
 *  - keyboard-accessible TEXT list is the equal-citizen alternative;
 *  - clicking/focusing an item opens an evidence inspector (counts, share,
 *    categories, caveats — 'why' provenance);
 *  - nothing presents frequency as a clinical preference.
 * Browser only (window.FlavorUI).
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FlavorUI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function readLocalFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(Object.assign(new Error('FileReader failed'), { code: 'file_read_failed' }));
      reader.readAsText(file);
    });
  }

  async function init(opts) {
    const dom = opts.dom || document;
    const section = dom.getElementById('flavoratlas');
    if (!section) return { mounted: false };
    buildStaticSkeleton(section);
    // ATLAS AUTO-LOAD: owner decree 2026-10-31 makes context/generated public;
    // the UI auto-loads the small generated atlas (upload stays as fallback).
    if (!root.FLAVOR_ATLAS_DEMO) section.querySelector('#flavor-demo').classList.add('hidden');
    const ATLAS_URL = 'context/generated/flavor-atlas-v1.json';
    fetch(ATLAS_URL).then((r) => {
      if (!r.ok) throw new Error(`atlas http ${r.status}`);
      return r.json();
    }).then((atlas) => {
      const profile = root.FlavorCore.buildTasteProfile(atlas, {});
      renderProfile(section, profile);
      section.querySelector('#flavor-status').textContent = `Atlas loaded (public per 2026-10-31 owner decree) — ${profile.items.length} ranked items from ${atlas.items} aggregated rows`;
    }).catch((err) => {
      section.querySelector('#flavor-status').textContent = `Atlas not loaded (${String(err.message || err)}) — use the file upload or DEMO data below.`;
    });
    const file = section.querySelector('#flavor-file');
    file.addEventListener('change', async () => {
      if (!file.files || !file.files[0]) return;
      try {
        const atlas = JSON.parse(await readLocalFile(file.files[0]));
        const profile = root.FlavorCore.buildTasteProfile(atlas, {});
        renderProfile(section, profile);
        section.querySelector('#flavor-status').textContent = `${profile.items.length} ranked items from ${atlas.items} aggregated rows`;
      } catch (err) {
        section.querySelector('#flavor-status').textContent = `Refused: ${err.code || err.message}`;
        section.querySelector('#flavor-ranks').innerHTML = '';
        section.querySelector('#flavor-bars').innerHTML = '';
        section.querySelector('#flavor-inspector').textContent = '';
      }
    });
    if (root.I18N) root.I18N.onChange(() => {
      const currentStatus = section.querySelector('#flavor-status').textContent;
      section.dataset.built = '0';
      buildStaticSkeleton(section);
      section.querySelector('#flavor-status').textContent = currentStatus;
    });
    return { mounted: true };
  }

  function buildStaticSkeleton(section) {
    if (section.dataset.built === '1') return;
    section.dataset.built = '1';
    const tF = (key) => (root.I18N ? root.I18N.t(key) : key);
    section.innerHTML = `
      <h2 id="flavoratlas-h2" class="text-xl font-bold text-amber-200">${tF("flavor.title")}</h2>
      <p class="text-sm text-stone-300">Frequency counts from the order workbook — displayed as behavioral aggregates with their caveats. Upload the atlas JSON locally (it never leaves this browser).</p>
      <div class="flex flex-wrap items-end gap-3 mt-2">
        <label class="text-sm">Atlas JSON
          <input id="flavor-file" type="file" accept=".json,application/json" class="text-xs border border-stone-600 rounded px-2 py-1"></label>
        <button id="flavor-demo" class="rounded border border-stone-500 px-3 py-1 text-xs text-stone-300">${tF("flavor.loadDemo")}</button>
      </div>
      <div id="flavor-status" role="status" aria-live="polite" class="mt-2 text-xs text-amber-100/80">(no atlas loaded)</div>
      <svg id="flavor-bars" role="list" aria-label="dish frequency bars" class="mt-3 w-full" viewBox="0 0 640 240"></svg>
      <div id="flavor-caveats" class="mt-2 text-xs text-stone-400"></div>
      <ol id="flavor-ranks" class="mt-3 space-y-1" tabindex="0"></ol>
      <div id="flavor-inspector" class="mt-3 rounded border border-stone-700 p-3 text-sm text-stone-300" aria-live="polite"></div>
    `;
  }

  function renderProfile(section, profile) {
    root.__pgkLastProfile = profile; // inspector source of truth
    renderBars(section, profile.items);
    renderList(section, profile);
    renderCaveats(section, profile);
  }
function renderBars(section, items) {
    const svg = section.querySelector('#flavor-bars');
    const top = items.slice(0, 10);
    const max = Math.max(1, ...top.map((x) => x.count));
    const barH = 20;
    svg.setAttribute('viewBox', `0 0 640 ${top.length * (barH + 6) + 10}`);
    svg.innerHTML = top.map((x, i) => {
      const w = Math.round((x.count / max) * 500);
      return `
        <g tabindex="0" role="listitem" data-name="${escapeHtml(x.name)}">
          <title>${escapeHtml(x.name)} — ${x.count} orders (${(100 * x.shareWithinDishPool).toFixed(0)}% of dish pool)</title>
          <rect x="0" y="${i * (barH + 6)}" width="${w}" height="${barH}" fill="#fbbf24" opacity="0.85"></rect>
          <text x="${w + 6}" y="${i * (barH + 6) + barH - 6}" fill="#e7e5e4" font-size="12">${escapeHtml(x.name)} · ${x.count}</text>
        </g>`;
    }).join('');
    svg.querySelectorAll('g').forEach((g) => g.addEventListener('click', () => inspectByName(section, g.dataset.name)));
    svg.querySelectorAll('g').forEach((g) => g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { inspectByName(section, g.dataset.name); ev.preventDefault(); } }));
  }

  function renderList(section, profile) {
    const ol = section.querySelector('#flavor-ranks');
    ol.innerHTML = profile.items.map((x, i) => `
      <li class="flex">
        <button class="text-left text-stone-200 underline decoration-dotted focus:outline-none focus:ring-2" data-name="${escapeHtml(x.name)}">
          ${i + 1}. ${escapeHtml(x.name)} — ${x.count} orders (${(100 * x.shareWithinDishPool).toFixed(0)}%)
        </button>
      </li>`).join('') || '<li class="text-stone-400">(nothing over the support floor)</li>';
    ol.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => inspectByName(section, b.dataset.name)));
  }

  function renderCaveats(section, profile) {
    section.querySelector('#flavor-caveats').innerHTML = profile.caveats.map((c) => `<span class="mr-3">⚠ ${escapeHtml(c.text)}</span>`).join('');
  }

  function inspectByName(section, name) {
    const box = section.querySelector('#flavor-inspector');
    const btn = section.querySelector(`button[data-name="${cssEscape(name)}"]`);
    const item = (root.__pgkLastProfile || { items: [] }).items.find((x) => x.name === name);
    if (!item || !btn) { box.textContent = 'No evidence available for that item.'; return; }
    const cats = item.topCategories.map((c) => `${c.id} ×${c.count}`).join(', ') || '(uncategorized)';
    box.innerHTML = `
      <h3 class="font-bold text-amber-300">${escapeHtml(item.name)} — evidence</h3>
      <p>Orders on record: <strong>${item.count}</strong> · share of dish pool: <strong>${(100 * item.shareWithinDishPool).toFixed(0)}%</strong></p>
      <p>Top categories: ${escapeHtml(cats)}</p>
      <p class="text-xs text-stone-400">Why this is honest: counts are behavioral aggregates; item descriptions are machine-inferred (dominant confidence shown above). This panel NEVER claims a clinical preference. Curated taste/texture hedges shown in the graph keep their 'inferred' tags.</p>`;
    box.setAttribute('data-inspecting', item.name);
  }

  function cssEscape(s) {
    return String(s).replace(/"/g, '\\"');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  return { init, renderProfile, inspectByName, escapeHtml };
});
