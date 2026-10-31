'use strict';
/**
 * LIVE URL E2E — runs the full test suite against the deployed
 * https://pillb.github.io/DietApp/ HTTPS Pages URL (production validation).
 * Per docs/DEPLOY_CHECKLIST.md gate 4 + docs/QA_RELEASE.md 'deployed Pages' lane.
 * Not a stub or fixture: real network, real CDN, real responses.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIVE = 'https://pillb.github.io/DietApp/';
const ROOT = path.resolve(__dirname, '..');
const report = { url: LIVE, timestamp: new Date().toISOString(), hardFail: false, failures: [], rows: [] };

function pass(label, ok, detail) {
  report.rows.push({ label, ok, detail });
  if (!ok) { report.hardFail = true; report.failures.push(label); }
}

async function loadAndBoot(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(LIVE, { waitUntil: 'load' });
  await page.waitForTimeout(2500); // CDN + engine boot + atlas/deficit fetch
  return { ctx, page, pageErrors };
}

async function bootAssets(browser) {
  const { page } = await loadAndBoot(browser, { width: 1360, height: 900 });
  const assets = {};
  for (const rel of ['data/canonical/docx-diet-recipes-canon.v1.json', 'data/reference/food-composition-tpca.v1.json', 'data/fixtures/lima-stores-v1.json', 'assets/css/tailwind.css', 'assets/js/app.js', 'assets/js/cook-mode-ui.js']) {
    const res = await page.request.get(`${LIVE}${rel}`);
    assets[rel] = res.status();
  }
  pass('live_assets_200', Object.values(assets).every((s) => s === 200), JSON.stringify(assets));
  return { page };
}

async function sectionsRender(browser, viewport) {
  const { page, pageErrors } = await loadAndBoot(browser, viewport);
  for (const id of ['#shopengine', '#planner', '#cookmode', '#flavoratlas']) {
    const n = await page.locator(id).count().catch(() => 0);
    pass(`section_${id.slice(1)}`, n === 1, `count=${n}`);
  }
  const title = await page.title();
  pass('page_title', title.includes('Gourmet'), title);
  pass('no_page_errors', pageErrors.length === 0, JSON.stringify(pageErrors));
  await page.close();
}

async function bootEngine(browser) {
  const { page, pageErrors } = await loadAndBoot(browser, { width: 1280, height: 900 });
  const mount = await page.evaluate(() => ({
    shopping: Boolean(document.querySelector('#shopengine #engine-plan-form')),
    planner: Boolean(document.querySelector('#planner #planner-entries')),
    cook: Boolean(document.querySelector('#cookmode #cook-recipe')),
    flavor: Boolean(document.querySelector('#flavoratlas #flavor-bars')),
  }));
  pass('engine_all4_mounted', Object.values(mount).every(Boolean), JSON.stringify(mount));
  pass('engine_no_errors', pageErrors.length === 0, JSON.stringify(pageErrors));
  await page.close();
}

async function mobileOverflow(browser) {
  for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }]) {
    const { page } = await loadAndBoot(browser, vp);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    pass(`mobile_no_hoverflow_${vp.width}`, !overflow, `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)}`);
    await page.close();
  }
}

async function addRecipePlanCook(browser) {
  const { page } = await loadAndBoot(browser, { width: 1280, height: 900 });
  // 37a8aa8 routed the engine panels: route to the view before interacting
  await page.evaluate(() => { location.hash = '#shopengine'; });
  await page.waitForSelector('#engine-from:visible', { timeout: 15000 }).catch(() => {});
  // shopping: add nikkei recipe
  await page.fill('#engine-from', '2026-11-01');
  await page.fill('#engine-to', '2026-11-30');
  await page.selectOption('#engine-recipe', 'nikkei-salmon-bowl');
  await page.fill('#engine-date', '2026-11-03');
  await page.fill('#engine-portions', '4');
  await page.click('#engine-plan-form button[type="submit"]');
  await page.waitForTimeout(300);
  const shopLines = await page.locator('#engine-groups li').count();
  pass('live_shopping_lines', shopLines > 0, `lines=${shopLines}`);
  // planner: entry appears (planner is a ROUTED view post-37a8aa8)
  await page.evaluate(() => { location.hash = '#planner'; });
  await page.waitForSelector('#planner-entries li:visible', { timeout: 15000 }).catch(() => {});
  const plannerRows = await page.locator('#planner-entries li').count();
  pass('live_planner_entries', plannerRows >= 1, `rows=${plannerRows}`);
  // cook: recipe + nutrition card (routed view)
  await page.evaluate(() => { location.hash = '#cookmode'; });
  await page.waitForSelector('#cook-recipe:visible', { timeout: 15000 }).catch(() => {});
  await page.selectOption('#cook-recipe', 'pescado_ajonjoli_diet');
  await page.waitForTimeout(200);
  const nut = await page.locator('#cook-nutrition').textContent();
  // default language is es-PE (owner directive): the Spanish label is the expected live text
  pass('live_nutrition_card', /por porc|computed-pending-weighin/i.test(nut), nut.trim().slice(0, 100));
  // i18n switcher (planner is routed — return to it)
  await page.evaluate(() => { location.hash = '#planner'; });
  await page.waitForSelector('#planner-lang:visible', { timeout: 15000 }).catch(() => {});
  await page.selectOption('#planner-lang', 'es-PE');
  await page.waitForTimeout(200);
  const headerEs = await page.locator('#planner-h2', { hasText: 'Planificador' }).count();
  pass('live_lang_espe', headerEs === 1, `found=${headerEs}`);
  await page.selectOption('#planner-lang', 'en');
  await page.close();
}

async function serviceWorkerLive(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(LIVE, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const sw = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return { count: regs.length || 0, scope: regs[0] ? regs[0].scope : 'none' };
  });
  pass('sw_registered', sw.count >= 1, JSON.stringify(sw));
  pass('sw_scope_correct', /DietApp/.test(sw.scope), SW_BADGE());
  function SW_BADGE() { return sw.scope; }
  // offline reload
  await ctx.setOffline(true);
  let offlineTitle = null;
  try {
    const p2 = await ctx.newPage();
    await p2.goto(LIVE, { waitUntil: 'load', timeout: 7000 });
    offlineTitle = await p2.title();
  } catch (e) {
    offlineTitle = `offline-failed: ${e.message.split('\n')[0].slice(0, 50)}`;
  }
  pass('sw_offline_title', offlineTitle != null && /Gourmet/.test(offlineTitle), `title=${offlineTitle}`);
  await ctx.setOffline(false);
  await page.close();
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch();
  try {
    await bootAssets(browser);
    await sectionsRender(browser, { width: 1360, height: 900 });
    await bootEngine(browser);
    await mobileOverflow(browser);
    await addRecipePlanCook(browser);
    await serviceWorkerLive(browser);
  } finally {
    await browser.close();
  }
  for (const r of report.rows) console.log(`[${r.ok ? '✔' : '✖'}] ${r.label}: ${r.detail}`);
  fs.writeFileSync(path.join(ROOT, 'tests', 'live_e2e_report.json'), JSON.stringify(report, null, 2));
  console.log(report.hardFail ? '\nLIVE URL E2E: FAIL\nURL: ' + LIVE : '\nLIVE URL E2E: PASS\nURL: ' + LIVE);
  process.exit(report.hardFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
