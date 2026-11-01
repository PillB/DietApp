'use strict';
/** COMPREHENSIVE LIVE AUDIT — every interactable element + all views at the deployed URL, es-PE default. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIVE = 'https://pillb.github.io/DietApp/';
const ROOT = path.resolve(__dirname, '..');
const results = [];
let hardFail = false;

function check(ok, label, detail) {
  results.push({ ok, label, detail: String(detail).slice(0, 130) });
  if (!ok) hardFail = true;
}


async function auditNavRoute(page, hash, link) {
  await link.click();
  const viewName = hash.slice(1).split('/')[0];
  const target = ['shopengine', 'planner', 'cookmode', 'flavoratlas', 'weighin'].includes(viewName)
    ? page.locator('#' + viewName)
    : page.locator(`section[x-show="view === '${viewName}'"]`);
  await target.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const visible = await target.isVisible().catch(() => false);
  const bounds = visible ? await target.boundingBox() : null;
  const viewport = page.viewportSize();
  const inViewport = Boolean(bounds && bounds.y < viewport.height && bounds.y + bounds.height > 0);
  const routeMatches = new URL(page.url()).hash === hash;
  const otherVisible = await Promise.all(
    ['shopengine', 'planner', 'cookmode', 'flavoratlas', 'weighin']
      .filter((name) => name !== viewName)
      .map((name) => page.locator('#' + name).isVisible())
  );
  check(visible && inViewport && routeMatches && otherVisible.every((v) => !v),
    `2-nav-${hash}`,
    `visible=${visible}; viewport=${inViewport}; route=${routeMatches}; otherEngines=${otherVisible.filter(Boolean).length}`);

}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 100)));

  await page.goto(LIVE, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // 1. Language default es-PE
  const lang = await page.evaluate(() => ({
    htmlLang: document.documentElement.lang,
    i18nLang: window.I18N ? window.I18N.getLanguage() : 'none',
    plannerTitle: document.querySelector('#planner-h2')?.textContent || '',
  }));
  check(lang.htmlLang === 'es-PE', '1a-html-lang-es-PE', lang.htmlLang);
  check(lang.i18nLang === 'es-PE', '1b-i18n-default', lang.i18nLang);
  check(/Planificador/.test(lang.plannerTitle), '1c-planner-title-es-PE', lang.plannerTitle);

  // 2. All nav views
  const hashes = ['#dashboard','#calendar','#week/1','#recipes','#shopping/1','#compliance','#nutrition','#knowledge','#shopengine','#planner','#cookmode','#flavoratlas','#weighin'];
  for (const hash of hashes) {
    const link = page.locator(`nav a[href="${hash}"]`);
    if (!(await link.count())) { check(false, `2-nav-${hash}`, 'absent'); continue; }
    await auditNavRoute(page, hash, link);
  }

  // 3. Recipe modal (es-PE headings)
  await page.locator('nav a[href="#recipes"]').first().click();
  await page.waitForTimeout(500);
  const gridButtons = page.locator("section[x-show=\"view === 'recipes'\"] .grid button");
  const cardCount = await gridButtons.count();
  check(cardCount >= 10, '3-modal-cards', `count=${cardCount}`);
  if (cardCount >= 1) {
    await gridButtons.first().click();
    await page.waitForTimeout(400);
    const headings = await page.evaluate(() => [...document.querySelectorAll('.fixed.inset-0 h3')].map((h) => h.textContent.trim()));
    check(headings.includes('Mise en place'), '3-modal-mise', headings.join(','));
    check(headings.includes('Ingredientes'), '3-modal-ingredientes', '');
    check(headings.includes('Preparación'), '3-modal-preparacion', '');
    await page.click('button[aria-label="Close recipe"]');
    await page.waitForTimeout(300);
    const modalHidden = !(await page.locator('div.fixed.inset-0.z-40').isVisible());
    check(modalHidden, '3-modal-closes', `modalHidden=${modalHidden}`);
  }

  // 4. Deficit builder
  await page.locator('nav a[href="#planner"]').first().click();
  await page.waitForTimeout(300);
  await page.selectOption('#deficit-target', '1200');
  await page.click('#deficit-build-btn');
  await page.waitForTimeout(200);
  check((await page.locator('#planner-status').textContent()).includes('unacknowledged_aggressive'), '4-deficit-1200-no-ack', '');
  await page.check('#deficit-ack');
  await page.click('#deficit-build-btn');
  await page.waitForTimeout(300);
  check((await page.locator('#planner-status').textContent()).includes('aggressive'), '4-deficit-1200-ack-built', '');
  check((await page.locator('#planner-entries li').count()) >= 14, '4-week-entries', '');

  // 5. Adequacy panel
  await page.click('#adequacy-btn');
  await page.waitForTimeout(400);
  check((await page.locator('#adequacy-table tbody tr').count()) >= 8, '5-adequacy-rows', '');

  // 6. Cook mode
  await page.locator('nav a[href="#cookmode"]').first().click();
  await page.waitForTimeout(300);
  await page.selectOption('#cook-recipe', 'pescado_ajonjoli_diet');
  await page.waitForTimeout(400);
  check(/Micros/.test(await page.locator('#cook-nutrition').textContent()), '6-cook-micros', '');
  check((await page.locator('#cook-steps', { hasText: 'Pase el pescado' }).count()) >= 1, '6-cook-docx-es-PE-steps', '');

  // 7. Weigh-in
  await page.locator('nav a[href="#weighin"]').first().click();
  await page.waitForTimeout(300);
  check((await page.locator('#weighin').count()) === 1, '7-weighin-mounted', '');
  check((await page.locator('#weighin-submit').textContent()) === 'Registrar pesa', '7-weighin-es-PE-button', '');

  // 8. Flavor ranking
  await page.locator('nav a[href="#flavoratlas"]').first().click();
  await page.waitForTimeout(800);
  check((await page.locator('#flavor-ranking .rounded.border').count()) >= 1, '8-flavor-ranking-cards', '');

  // 9. Privacy 404s
  for (const f of ['data/private/report.md', 'data/private/food_delivery_orders_extracted(2).xlsx']) {
    const res = await page.request.get(LIVE + f);
    check(res.status() === 404, `9-privacy-${path.basename(f).slice(0, 20)}`, `status=${res.status()}`);
  }

  // 10. No page errors
  const realErrors = errors.filter((e) => !/favicon|autofill/i.test(e));
  check(realErrors.length === 0, '10-no-page-errors', `${realErrors.length}`);

  await ctx.close();
  await browser.close();
  for (const r of results) console.log(`[${r.ok ? '✔' : '✖'}] ${r.label}: ${r.detail}`);
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\nCOMPREHENSIVE LIVE AUDIT: ${bad ? bad + ' FINDINGS' : 'ALL PASS'} (${results.length} checks)`);
  fs.writeFileSync(path.join(ROOT, 'tests', 'comprehensive_audit_report.json'), JSON.stringify({ results, hardFail }, null, 2));
  process.exit(hardFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
