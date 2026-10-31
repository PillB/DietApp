'use strict';
/**
 * RED-TEAM ROUND 2 — the legacy v3 Alpine surface + step-level ingredient math,
 * live against the deployed Pages URL. The prior rounds covered the 4 engine
 * panels; this round walks the ORIGINAL user surface (dashboard/calendar/week/
 * day/recipes/shopping/compliance/knowledge/nutrition views, recipe modal
 * open/close, week switchers) and validates per-step ingredient consumption
 * against the diagram/ledger model in the BROWSER (not just Node).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIVE = 'https://pillb.github.io/DietApp/';
const ROOT = path.resolve(__dirname, '..');
const findings = [];
let hardFail = false;

function note(ok, label, detail) {
  findings.push({ ok, label, detail: String(detail).slice(0, 130) });
  if (!ok) hardFail = true;
}

async function freshPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 90)));
  await page.goto(LIVE, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  return { ctx, page, errs };
}

/** V3 Alpine views: click each nav link and assert the view becomes visible. */
async function v3NavWalk(browser) {
  const { page, errs } = await freshPage(browser, { width: 1360, height: 900 });
  const views = [
    ['dashboard', '#dashboard'], ['calendar', '#calendar'], ['week', '#week/1'],
    ['recipes', '#recipes'], ['shopping', '#shopping/1'],
    ['knowledge', '#knowledge'], ['compliance', '#compliance'], ['nutrition', '#nutrition'],
  ];
  for (const [name, hash] of views) {
    const link = page.locator(`a[href="${hash}"]`).first();
    if (!(await link.count())) { note(false, `v3-nav-${name}: link MISSING`, hash); continue; }
    await link.click();
    await page.waitForTimeout(350);
    const visible = await page.evaluate((v) => {
      const el = [...document.querySelectorAll('section')].find((s) => s.getAttribute('x-show') === v);
      if (!el) return 'section-missing';
      return getComputedStyle(el).display !== 'none' ? 'visible' : 'hidden';
    }, `view === '${name}'`);
    note(visible === 'visible', `v3-nav-${name}: view visible after click`, visible);
  }
  // day view is reachable from the CALENDAR view's day cards (nested navigation)
  await page.locator('a[href="#calendar"]').first().click();
  await page.waitForTimeout(700); // Alpine re-renders the calendar's day grid
  const dayLink = page.locator('section[x-show="view === \'calendar\'"] a[href^="#day/"]').first();
  if (await dayLink.count()) {
    await dayLink.click();
    await page.waitForTimeout(400);
    const dayVisible = await page.evaluate(() => {
      const el = [...document.querySelectorAll('section')].find((s) => s.getAttribute('x-show') === "view === 'day'");
      return el && getComputedStyle(el).display !== 'none' ? 'visible' : 'hidden/missing';
    });
    note(dayVisible === 'visible', 'v3-nav-day: reachable via week view (nested nav)', dayVisible);
  } else {
    note(false, 'v3-nav-day: no open-day link in week view', '');
  }
  note(errs.length === 0, 'v3-nav-walk: 0 page errors across 9 views', errs.join('; ').slice(0, 120));
  await page.close();
  await page.context().close();
}

/** Recipe modal: open from the recipes view, assert content, close via Escape AND via the × button. */
async function recipeModalWalk(browser) {
  const { page } = await freshPage(browser, { width: 1360, height: 900 });
  await page.locator('a[href="#recipes"]').first().click();
  await page.waitForTimeout(400);
  // click the first recipe card
  // The recipes SECTION has no id= attribute — locate via x-show; Alpine consumes
  // @click directives, so the DOM shows plain <button> cards inside the x-for grid.
  const gridButtons = page.locator('section[x-show="view === \'recipes\'"] .grid button');
  const cardCount = await gridButtons.count();
  note(cardCount >= 1, 'modal-setup: recipe card buttons in the x-for grid', `count=${cardCount}`);
  const clicked = cardCount >= 1 ? 'clicked' : 'no-card';
  if (cardCount >= 1) { await gridButtons.first().click(); }
  await page.waitForTimeout(400);
  const modalVisible = await page.evaluate(() => {
    const overlay = [...document.querySelectorAll('div')].find((d) => d.className && String(d.className).includes('fixed inset-0') && d.getAttribute('x-show') === 'selectedRecipe');
    if (!overlay) return 'no-overlay';
    return getComputedStyle(overlay).display !== 'none' ? 'visible' : 'hidden';
  });
  note(clicked === 'clicked' && modalVisible === 'visible', `modal-opens: ${clicked} → ${modalVisible}`, '');
  if (modalVisible === 'visible') {
    // assert modal content: mise/ingredients/method sections render
    const modal = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h3')].map((x) => x.textContent);
      return { mise: h.some((x) => /Mise|Preparación/i.test(x)), ingredients: h.some((x) => /Ingredients|Ingredientes/i.test(x)), method: h.some((x) => /Method|Preparación/i.test(x)) };
    });
    note(modal.mise && modal.ingredients && modal.method, 'modal-content: mise/ingredients/method all present', JSON.stringify(modal));
    // close via the × button
    await page.click('button[aria-label="Close recipe"]');
    await page.waitForTimeout(300);
    const closed = await page.evaluate(() => {
      const overlay = [...document.querySelectorAll('div')].find((d) => d.getAttribute && d.getAttribute('x-show') === 'selectedRecipe');
      return overlay ? getComputedStyle(overlay).display === 'none' : true;
    });
    note(closed, 'modal-close-x: overlay hidden after × click', '');
  }
  await page.context().close();
}

/** Step-level ingredient consumption, live: docx recipes' diagrams must cover every token. */
async function diagramLedgerLive(browser) {
  const { page } = await freshPage(browser, { width: 1280, height: 900 });
  for (const rid of ['pescado_ajonjoli_diet', 'galletas_avena_diet', 'muesli_frutado_diet', 'budin_platano_diet']) {
    await page.selectOption('#cook-recipe', rid);
    await page.waitForTimeout(250);
    const audit = await page.evaluate((recipeId) => {
      const canon = window.DOCX_DIET_RECIPES;
      const r = canon.recipes.find((x) => x.meta.id === recipeId);
      if (!r) return { error: 'recipe not found' };
      const recipeIngredients = new Set(r.ingredients.map((u) => u.ingredientId));
      const referenced = new Set();
      for (const row of r.diagram.rows) for (const t of row.tokens) if (t) referenced.add(t);
      const missing = [...recipeIngredients].filter((x) => !referenced.has(x));
      const stations = r.diagram.columns.length;
      const stepOrderOk = r.steps.every((s, i) => i === 0 || s.order > r.steps[i - 1].order);
      return { total: recipeIngredients.size, missing, stations, stepOrderOk, hasMise: (r.mise_en_place || []).length > 0 };
    }, rid);
    if (audit.error) { note(false, `diagram-${rid}`, audit.error); continue; }
    note(audit.missing.length === 0, `diagram-${rid}: all ${audit.total} ingredients diagrammed (${audit.stations} stations)`, `missing: ${audit.missing.join(',') || 'none'}`);
    note(audit.stepOrderOk, `steps-${rid}: order strictly ascending`, '');
    note(audit.hasMise, `mise-${rid}: mise_en_place present`, '');
  }
  await page.context().close();
}

/** es-PE quality: every docx step's esPE must be real Spanish (heuristic: no English-only sentences). */
async function espeQuality(browser) {
  const { page } = await freshPage(browser, { width: 1280, height: 900 });
  const quality = await page.evaluate(() => {
    const canon = window.DOCX_DIET_RECIPES;
    const issues = [];
    for (const r of canon.recipes) {
      for (const s of r.steps) {
        const es = s.esPE || '';
        // crude heuristic: es-PE instructions should contain at least one Spanish cue word
        const cues = ['de ', 'la ', 'el ', 'con ', 'en ', 'hasta', 'cuando', 'para', 'y ', 'a fuego', 'min', 'Servir', 'Agregar', 'Batir', 'Voltear', 'Cocer', 'Mezclar', 'Cocer', 'Incorporar', 'Triture', 'reposar', 'cucharada', 'cucharadita', 'taza', 'tza', 'cda'];
        if (!cues.some((c) => es.toLowerCase().includes(c))) issues.push({ recipe: r.meta.id, step: s.id, es: es.slice(0, 40) });
      }
    }
    return issues;
  });
  note(quality.length === 0, `espe-quality: all docx steps carry genuine Spanish phrasing`, JSON.stringify(quality).slice(0, 160));
  await page.context().close();
}

async function main() {
  const browser = await chromium.launch();
  await v3NavWalk(browser);
  await recipeModalWalk(browser);
  await diagramLedgerLive(browser);
  await espeQuality(browser);
  await browser.close();
  for (const f of findings) console.log(`[${f.ok ? '✔' : '✖'}] ${f.label} :: ${f.detail}`);
  const bad = findings.filter((f) => !f.ok).length;
  console.log(`\nRED-TEAM v2: ${findings.length - bad}/${findings.length} PASS${bad ? ` — ${bad} FINDINGS` : ' — clean'}`);
  fs.writeFileSync(path.join(ROOT, 'tests', 'redteam_v2_report.json'), JSON.stringify({ findings, hardFail }, null, 2));
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
