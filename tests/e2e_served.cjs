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
  const GUARD = /^\/(data\/private|context|Context information)(\/|$)/;
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
  steps.esPeDraftTag = await page.locator('#engine-groups', { hasText: '(es-PE borrador)' }).count();
  await page.screenshot({ path: path.join(ROOT, 'tests', 'e2e_shopping_flow.png'), fullPage: false });
  await browser.close();
  const failed = pageErrors.length > 0 || steps.lineCount === 0 || steps.refusalShown > 0 || steps.esPeDraftName === 0 || steps.esPeDraftTag === 0;
  report.rows.push({ tag: 'shopping-flow', pageErrors, steps, failed });
  if (failed) {
    console.log(`\n== shopping-flow (FAIL) == steps: ${JSON.stringify(steps)}`);
    console.log(`pageErrors: ${JSON.stringify(pageErrors)}`);
  } else {
    console.log(`\n== shopping-flow (PASS) == steps: ${JSON.stringify(steps)}`);
  }
  return failed;
}

/** P2.2 planner flow: repeat weekly ×2 from the added entry; expect family growth. */
async function plannerFlow(port, report) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500); // boot + fixture
  const steps = {};
  await page.fill('#engine-from', '2026-11-01');
  await page.fill('#engine-to', '2026-11-30');
  await page.selectOption('#engine-recipe', 'nikkei-salmon-bowl');
  await page.fill('#engine-date', '2026-11-03');
  await page.fill('#engine-portions', '4');
  await page.click('#engine-plan-form button[type="submit"]');
  await page.waitForTimeout(200);
  steps.beforeRepeat = await page.locator('#planner-entries li').count();
  await page.click('[data-op="repeat"]');
  await page.waitForTimeout(200);
  steps.afterRepeat = await page.locator('#planner-entries li').count();
  steps.scrollText = await page.locator('#planner-status').textContent();
  // repeat-family badge: ⟲×N appears on generated rows (count == weeks+source)
  steps.familyBadges = await page.locator('#planner-entries span[title^="repeat family"]').count();
  // separate copy-date semantics: copy the LAST listed row into a distinct date
  const lastRow = page.locator('#planner-entries li').last();
  await lastRow.locator('[data-op="copydate"]').fill('2026-11-20');
  await lastRow.locator('[data-op="copy"]').click();
  await page.waitForTimeout(200);
  steps.afterCopy = await page.locator('#planner-entries li').count();
  // shopping line growth via shared refresh (4×3 portions in range now)
  steps.shoppingLinesAfter = await page.locator('#engine-groups li').count();
  await page.screenshot({ path: path.join(ROOT, 'tests', 'e2e_planner_flow.png') });
  await browser.close();
  const failed = pageErrors.length > 0 || steps.afterRepeat !== 3 || steps.familyBadges < 2 || steps.afterCopy !== 4 || steps.shoppingLinesAfter <= steps.beforeRepeat;
  report.rows.push({ tag: 'planner-flow', pageErrors, steps, failed });
  console.log(failed
    ? `\n== planner-flow (FAIL) == steps: ${JSON.stringify(steps)} errors: ${JSON.stringify(pageErrors)}`
    : `\n== planner-flow (PASS) == steps: ${JSON.stringify(steps)}`);
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
    console.log('guard check: /data/private/* refused with 403 ✔ ; fixtures served with 200 ✔');
    await auditBook(report, { width: 1360, height: 900 }, 'desktop');
    await auditBook(report, { width: 390, height: 844 }, 'mobile');
    const shopFailed = await shoppingFlow(port, report);
    const planFailed = await plannerFlow(port, report);
    summarize(report, shopFailed || planFailed);
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
