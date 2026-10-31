'use strict';
/**
 * P0.3 — true served-site E2E baseline (reproducible, replaces the old
 * `page.set_content()`-only mock documented in tests/QA_REPORT.md).
 *
 * What is genuinely tested (NOT mocked): real Chromium, real static serving of
 * repo root over HTTP, real network requests for local assets and the CDNs,
 * console/pageerror capture, tab navigation click, viewport overflow checks,
 * screenshots. Honest-failure policy:/local assets must fully load or the test
 * fails; CDN behavior is *recorded* (and only asserted for pageerror-free
 * Alpine mounting when reachable) so the report reflects reality.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.md': 'text/markdown',
};

/** Hardened static server: refuses to serve private guard paths (defense in
 * depth on top of .gitignore — localhost page bugs cannot exfiltrate them). */
function createServer(root) {
  const GUARD = /^\/(data\/private|context\/private|Context information)(\/|$)/;
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (GUARD.test(urlPath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return void res.end('private path refused');
    }
    const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403); return void res.end();
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }); return void res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
}

async function audit(viewport, tag, report) {  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const localMissing = [];
  const cdnResults = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    const url = r.url();
    if (url.startsWith('http://localhost')) {
      if (r.status() >= 400) localMissing.push(`${r.status()} ${url}`);
    } else if (url.startsWith('https://')) {
      cdnResults.push(`${r.status()} ${url}`);
    }
  });
  await page.goto(`http://localhost:${report.port}/`, { waitUntil: 'load' }).catch((e) => { pageErrors.push('goto:' + e.message); });
  await page.waitForTimeout(1200); // Alpine CDN defers + init

  const title = await page.title().catch(() => '(threw)');
  const navCount = await page.locator('nav a').count().catch(() => -1);
  const alpineMounted = await page.evaluate(() => Boolean(window.Alpine) || Boolean(document.querySelector('[data-alpine-mount]') || window.alpinejs)).catch(() => false);
  // horizontal overflow check at this viewport (per QA requirements)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => null);
  await page.screenshot({ path: path.join(ROOT, 'tests', `e2e_served_${tag}.png`), fullPage: true });
  await browser.close();

  const row = {
    tag, title, navCount, alpineMounted, overflow,
    consoleErrors, pageErrors, localMissing, cdnResults,
  };
  report.rows.push(row);
  return row;
}

/** P3.2 shopping-engine flow: plan an entry, grouped list renders, no overflow. */
async function shoppingFlow(port, report) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); // fixture fetch + scripts
  const steps = {};
  steps.sectionMounted = await page.locator('#shopengine').count();
  if (steps.sectionMounted === 0) { report.rows.push({ tag: 'shopping-flow', pageErrors, steps, failed: true }); await browser.close(); return true; }
  await page.locator('nav a[href="#shopengine"]').first().click();
  await page.locator('#engine-from').waitFor({state:'visible'});
  await page.fill('#engine-from', '2026-11-01');
  await page.fill('#engine-to', '2026-11-30');
  await page.selectOption('#engine-recipe', 'nikkei-salmon-bowl');
  await page.fill('#engine-date', '2026-11-03');
  await page.fill('#engine-portions', '4');
  await page.click('#engine-plan-form button[type="submit"]');
  await page.waitForTimeout(300);
  steps.lineCount = await page.locator('#engine-groups li').count();
  steps.groupHeadings = await page.locator('#engine-groups h3').count();
  steps.refusalShown = await page.locator('#engine-groups .text-red-300').count();
  steps.esPeDraftName = await page.locator('#engine-groups', { hasText: 'salmón' }).count();
  steps.esPeDraftTag = await page.locator('#engine-groups', { hasText: 'es-PE en revisión' }).count();
  await page.screenshot({ path: path.join(ROOT, 'tests', 'e2e_shopping_flow.png'), fullPage: false });
  const purchaseBox = page.locator('#engine-groups input[data-purchase-key]').first();
  await purchaseBox.check();
  steps.checkedBeforeRefresh = await purchaseBox.isChecked();
  const purchaseKey = await purchaseBox.getAttribute('data-purchase-key');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.locator('nav a[href="#shopengine"]').first().click();
  await page.locator('#engine-from').fill('2026-11-01');
  await page.locator('#engine-to').fill('2026-11-30');
  const restored = page.locator('#engine-groups input[data-purchase-key]').first();
  steps.purchaseKeyAfterRefresh = await restored.getAttribute('data-purchase-key');
  steps.checkedAfterRefresh = await restored.isChecked();
  steps.sameDemand = purchaseKey === steps.purchaseKeyAfterRefresh;
  await page.screenshot({ path: path.join(ROOT, 'tests', 'e2e_shopping_persistence.png') });
  await browser.close();
  const failed = pageErrors.length > 0 || steps.lineCount === 0 || steps.refusalShown > 0 || steps.esPeDraftName === 0
    || steps.esPeDraftTag === 0 || !steps.checkedBeforeRefresh || !steps.checkedAfterRefresh || !steps.sameDemand;
  report.rows.push({ tag: 'shopping-flow', pageErrors, steps, failed });
  if (failed) {
    console.log(`\n== shopping-flow (FAIL) == steps: ${JSON.stringify(steps)}`);
    console.log(`pageErrors: ${JSON.stringify(pageErrors)}`);
  } else {
    console.log(`\n== shopping-flow (PASS) == steps: ${JSON.stringify(steps)}`);
  }
  return failed;
}

/** P6 language-switch assertions split out of the planner flow (CC budget). */
async function assertIntlSwitches(page, steps) {
  await page.selectOption('#planner-lang', 'es-PE');
  await page.waitForTimeout(200);
  steps.langEspe = await page.locator('#planner-h2', { hasText: 'Planificador' }).count();
  steps.shoppingHeaderEs = await page.locator('#shopengine-h2', { hasText: 'Lista de compras' }).count();
  // Spanish-first default check happens in a fresh context (see e2e default-load probe)
  await page.selectOption('#planner-lang', 'zh-Hans');
  await page.waitForTimeout(200);
  steps.langZh = await page.locator('#planner-h2', { hasText: '计划器' }).count();
  steps.cookHeaderZh = await page.locator('#cookmode h2', { hasText: '烹饪模式' }).count();
  await page.selectOption('#planner-lang', 'ja');
  await page.waitForTimeout(200);
  steps.langJa = await page.locator('#planner-h2', { hasText: 'プランナー' }).count();
  await page.selectOption('#planner-lang', 'en');
  await page.waitForTimeout(200);
}

async function assertDeficitBuilder(page, steps) {
  await page.selectOption('#deficit-target', '1400');
  await page.click('#deficit-build-btn');
  await page.waitForTimeout(200);
  steps.deficitRefusal = (await page.locator('#planner-status').textContent()).includes('unacknowledged_aggressive');
  await page.selectOption('#deficit-target', '1500');
  await page.click('#deficit-build-btn');
  await page.waitForTimeout(300);
  steps.afterDeficit = await countPlannerRows(page);
  steps.deficitStatus = (await page.locator('#planner-status').textContent()).trim().slice(0, 70);
  steps.deficitExplanations = await page.locator('#deficit-explanations div').count();
}

async function countPlannerRows(page) {
  return await page.locator('#planner-entries li').count();
}

async function copyLastRow(page) {
  const lastRow = page.locator('#planner-entries li').last();
  await lastRow.locator('[data-op="copydate"]').fill('2026-11-20');
  await lastRow.locator('[data-op="copy"]').click();
  await page.waitForTimeout(200);
  return await page.locator('#planner-entries li').count();
}

async function addNikkeiEntry(page) {
  await page.locator('nav a[href="#shopengine"]').first().click();
  await page.locator('#engine-from').waitFor({state:'visible'});
  await page.fill('#engine-from', '2026-11-01');
  await page.fill('#engine-to', '2026-11-30');
  await page.selectOption('#engine-recipe', 'nikkei-salmon-bowl');
  await page.fill('#engine-date', '2026-11-03');
  await page.fill('#engine-portions', '4');
  await page.click('#engine-plan-form button[type="submit"]');
  await page.waitForTimeout(200);
}

async function plannerFlow(port, report) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); // boot + fixture
  const steps = {};
  await addNikkeiEntry(page);
  await page.locator('nav a[href="#planner"]').first().click();
  await page.locator('#planner-h2').waitFor({state:'visible'});
  await page.waitForTimeout(200);
  steps.beforeRepeat = await countPlannerRows(page);
  await page.click('[data-op="repeat"]');
  await page.waitForTimeout(200);
  steps.afterRepeat = await countPlannerRows(page);
  steps.scrollText = await page.locator('#planner-status').textContent();
  // repeat-family badge: ⟲×N appears on generated rows (count == weeks+source)
  steps.familyBadges = await page.locator('#planner-entries span[title^="familia de repetición"]').count();

  // separate copy-date semantics: copy the LAST listed row into a distinct date
  steps.afterCopy = await copyLastRow(page);
  // DEFICIT week builder: 1500 kcal without ack builds; 1400 without ack refuses
  await assertDeficitBuilder(page, steps);
  // P6 language switcher through the split helper (CC budget)
  await assertIntlSwitches(page, steps);
  // shopping line growth via shared refresh (4×3 portions in range now)
  steps.shoppingLinesAfter = await page.locator('#engine-groups li').count();
  await page.screenshot({ path: path.join(ROOT, 'tests', 'e2e_planner_flow.png') });
  await browser.close();
  const failed = plannerFlowFailed(steps) || pageErrors.length > 0;
  report.rows.push({ tag: 'planner-flow', pageErrors, steps, failed });
  console.log(failed
    ? `\n== planner-flow (FAIL) == steps: ${JSON.stringify(steps)} errors: ${JSON.stringify(pageErrors)}`
    : `\n== planner-flow (PASS) == steps: ${JSON.stringify(steps)}`);
  return failed || pageErrors.length > 0;
}

function plannerFlowFailed(steps) {
  return steps.afterRepeat !== 3 || steps.familyBadges < 2 || steps.afterCopy !== 4 || steps.shoppingLinesAfter <= steps.beforeRepeat
    || !steps.deficitRefusal || steps.afterDeficit <= steps.afterCopy || !String(steps.deficitStatus).includes('moderate') || steps.deficitExplanations === 0
    || steps.langEspe === 0 || steps.langZh === 0 || steps.langJa === 0 || steps.shoppingHeaderEs === 0 || steps.cookHeaderZh === 0;
}

/** P4.1 cook-mode flow: default recipe, badges, extraction verdicts, leftover advice. */
async function cookFlow(port, report) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const steps = {};
  steps.sectionMounted = await page.locator('#cookmode').count();
  if (!steps.sectionMounted) { report.rows.push({ tag: 'cook-flow', pageErrors, steps, failed: true }); await browser.close(); return true; }
  await page.locator('nav a[href="#cookmode"]').first().click();
  await page.locator('#cook-recipe').waitFor({state:'visible'});
  await page.selectOption('#cook-recipe', 'nikkei-salmon-bowl');
  await page.waitForTimeout(200);
  steps.badge = (await page.locator('#cook-badge').textContent()).trim().slice(0, 90);
  steps.stepCards = await page.locator('#cook-steps li').count();
  steps.sixtyThreeClaim = await page.locator('#cook-steps', { hasText: '63°C (unverified)' }).count()
    + await page.locator('#cook-steps', { hasText: 'claim 63°C (unverified)' }).count();
  steps.failsAuthority = await page.locator('#cook-steps', { hasText: 'fails-authoritative-floor' }).count();
  steps.reviewPending = await page.locator('#cook-review-status', { hasText: 'not ready for publication' }).count();
  await page.click('#cook-leftovers');
  steps.leftoverStatus = (await page.locator('#cook-leftover-result').textContent()).trim().slice(0, 60);
  // docx ⭐ recipes + CFE diagram rendering
  await page.selectOption('#cook-recipe', 'pescado_ajonjoli_diet');
  await page.waitForTimeout(200);
  steps.docxDiagram = await page.locator('#cook-diagram table').count();
  steps.diagramStations = await page.locator('#cook-diagram thead th').count();
  steps.diagramFishTokens = await page.locator('#cook-diagram', { hasText: 'filete_pescado_blanco' }).count();
  steps.docxCoveredGate = await page.locator('#cook-steps', { hasText: '63°C' }).count();
  // weighed-7 recipes show es-PE draft lines with the borrador tag
  await page.selectOption('#cook-recipe', 'nikkei-salmon-bowl');
  await page.waitForTimeout(300);
  steps.weighedEsPe = await page.locator('#cook-steps', { hasText: 'Cocer 220 g de arroz integral' }).count();
  steps.weighedBorradorTag = await page.locator('#cook-steps', { hasText: '(es-PE borrador)' }).count();
  // P-Diet computed per-serving nutrition card (computed-pending-weighin)
  const fishNutrition = await page.locator('#cook-nutrition').textContent();
  // es-PE default: the card renders the Spanish label ('Por porción (cálculo estimado...)')
  steps.nutritionCard = /por porción|computed-pending-weighin/i.test(fishNutrition);
  steps.nutritionKcal = /[\d.]+ kcal/.test(fishNutrition);
  steps.nutritionMacroHonesty = fishNutrition.includes('NO es rendimiento de cocina pesado');
  await page.screenshot({ path: path.join(ROOT, 'tests', 'e2e_cook_flow.png') });
  await browser.close();
  const failed = pageErrors.length > 0 || steps.stepCards < 3 || steps.sixtyThreeClaim === 0 || steps.reviewPending === 0
    || steps.docxDiagram === 0 || steps.diagramStations < 3 || steps.diagramFishTokens === 0 || steps.docxCoveredGate === 0
    || steps.weighedEsPe === 0 || steps.weighedBorradorTag === 0
    || !steps.nutritionCard || !steps.nutritionKcal || !steps.nutritionMacroHonesty;
  report.rows.push({ tag: 'cook-flow', pageErrors, steps, failed });
  console.log(failed
    ? `\n== cook-flow (FAIL) == steps: ${JSON.stringify(steps)} errors: ${JSON.stringify(pageErrors)}`
    : `\n== cook-flow (PASS) == steps: ${JSON.stringify(steps)}`);
  return failed;
}

/** P5.3 flavor-atlas flow: real atlas uploads render; inspector shows why evidence. */
async function flavorFlow(port, report) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2000); // atlas fetch + boot
  const steps = {};
  steps.sectionMounted = await page.locator('#flavoratlas').count();
  if (!steps.sectionMounted) { report.rows.push({ tag: 'flavor-flow', pageErrors, steps, failed: true }); await browser.close(); return true; }
  await page.locator('nav a[href="#flavoratlas"]').first().click();
  await page.locator('#flavoratlas').waitFor({state:'visible'});
  steps.barsRendered = await page.locator('#flavor-bars g').count();
  steps.topText = (await page.locator('#flavor-status').textContent()).includes('decreto del dueño');
  const first = page.locator('#flavor-ranks button').first();
  if (await first.count()) { await first.click(); await page.waitForTimeout(150); }
  steps.inspectorEvidence = await page.locator('#flavor-inspector', { hasText: 'evidence' }).count();
  steps.behavioralHonesty = await page.locator('#flavor-inspector', { hasText: 'NEVER claims a clinical preference' }).count();
  steps.caveatsShown = await page.locator('#flavor-caveats span').count();
  await page.screenshot({ path: path.join(ROOT, 'tests', 'e2e_flavor_flow.png') });
  await browser.close();
  const failed = pageErrors.length > 0 || steps.barsRendered === 0 || !steps.topText || steps.inspectorEvidence === 0 || steps.behavioralHonesty === 0;
  report.rows.push({ tag: 'flavor-flow', pageErrors, steps, failed });
  console.log(failed
    ? `\n== flavor-flow (FAIL) == steps: ${JSON.stringify(steps)} errors: ${JSON.stringify(pageErrors)}`
    : `\n== flavor-flow (PASS) == steps: ${JSON.stringify(steps)}`);
  return failed || pageErrors.length > 0;
}

async function main() {
  const server = createServer(ROOT);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const report = { port, rows: [] };
  try {
    // seeded negative: guard paths must be refused even though files exist on disk
    const guardURL = `http://localhost:${port}/data/private/report.md`;
    const res = await fetch(guardURL);
    if (res.status !== 403) throw new Error(`private path guard failed: got ${res.status} for ${guardURL}`);
    const fixtureRes = await fetch(`http://localhost:${port}/data/fixtures/lima-stores-v1.json`);
    if (fixtureRes.status !== 200) throw new Error(`public fixture should be served, got ${fixtureRes.status}`);
    const atlasRes = await fetch(`http://localhost:${port}/context/generated/flavor-atlas-v1.json`);
    if (atlasRes.status !== 200) throw new Error(`context/generated atlas should be served (owner decree 2026-10-31), got ${atlasRes.status}`);
    const atlasLowRes = await fetch(`http://localhost:${port}/context/2026-05-01-2026-10-26-flavor-profile-analysis.json`);
    console.log(`atlas served: ${atlasRes.status} ✔ ; original bundle fetch: ${atlasLowRes.status} (owner-discretionary)`);
    console.log('guard check: /data/private/* refused with 403 ✔ ; fixtures served with 200 ✔');
    await auditBook(report, { width: 1360, height: 900 }, 'desktop');
    await auditBook(report, { width: 390, height: 844 }, 'mobile');
    const shopFailed = await shoppingFlow(port, report);
    const planFailed = await plannerFlow(port, report);
    const cookFailed = await cookFlow(port, report);
    const flavorFailed = await flavorFlow(port, report);
    summarize(report, shopFailed || planFailed || cookFailed || flavorFailed);
  } finally {
    server.close();
  }
}

/** diagnostics-block rows keep old format {rows} for report readers */
async function auditBook(report, viewport, tag) {
  return audit(viewport, tag, report);
}

function summarize(report, shopFailed) {
  let failed = Boolean(shopFailed);
  for (const row of report.rows) {
    console.log(`\n== ${row.tag} ==`);
    if (row.title !== undefined) {
      console.log(`title: ${row.title}`);
      console.log(`nav links: ${row.navCount} | alpineMounted: ${row.alpineMounted} | hOverflow: ${row.overflow}`);
      console.log(`consoleErrors: ${JSON.stringify(row.consoleErrors)}`);
      console.log(`localMissing(404+): ${JSON.stringify(row.localMissing)}`);
      console.log(`external responses: ${row.cdnResults.join(' | ') || 'none'}`);
    }
    // GATES: local assets must all exist; no uncaught JS errors; header/nav must render.
    if (row.localMissing && (row.localMissing.length || row.pageErrors.length || row.navCount < 4)) failed = true;
    if (row.tag === 'mobile' && row.overflow) failed = true; // 390px gate
  }
  fs.writeFileSync(path.join(ROOT, 'tests', 'e2e_served_report.json'), JSON.stringify(report, null, 2));
  console.log(failed ? '\nE2E SERVED BASELINE: FAIL (see findings above)' : '\nE2E SERVED BASELINE: PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
