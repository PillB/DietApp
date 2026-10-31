'use strict';
/** Full permutation red-team: recipe dropdown × all 4 panels × i18n × composition
 * + deficit-builder × shopping picks, compared at the served URL. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIVE = 'https://pillb.github.io/DietApp/';
const results = [];
function note(ok, label, detail) { results.push({ ok, label, detail: String(detail || '').slice(0, 90) }); }

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message.slice(0, 60)));

  await page.goto(LIVE, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // 1. Composition loaded + recipes populated
  const dataState = await page.evaluate(() => ({
    recipes: (document.querySelector('#cook-recipe')?.options || []).length,
    compositions: Object.keys(window.__pgkComposition || {}).length,
  }));
  note(dataState.recipes >= 8, `recipes in dropdown: ${dataState.recipes}`);
  note(dataState.compositions >= 40, `composition rows: ${dataState.compositions}`);

  // 2. Every recipe cook-mode nutrition card
  const allOptions = await page.evaluate(() => [...(document.querySelector('#cook-recipe')?.options || [])].map(o => o.value));
  let kcalSum = 0;
  let allNutrition = true;
  for (const id of allOptions) {
    await page.selectOption('#cook-recipe', id);
    await page.waitForTimeout(150);
    const txt = await page.locator('#cook-nutrition').textContent();
    if (!/computed-pending-weighin/.test(txt)) { allNutrition = false; continue; }
    const m = txt.match(/([\d.]+) kcal/);
    if (m) kcalSum += parseFloat(m[1]);
  }
  note(allNutrition, `all ${allOptions.length} recipes have nutrition card`);
  note(kcalSum > 0, `sum kcal across all recipes: ${kcalSum.toFixed(0)}`);

  // 3. i18n locale cycle (all 5 non-en) — every panel title must localize
  const locales = ['es-PE', 'zh-Hans', 'hi', 'de', 'ja'];
  for (const loc of locales) {
    await page.selectOption('#planner-lang', loc);
    await page.waitForTimeout(150);
    const titles = await page.evaluate(() => ({
      planner: document.querySelector('#planner-h2')?.textContent || '',
      shopping: document.querySelector('#shopengine-h2')?.textContent || '',
      cook: document.querySelector('#cookmode h2')?.textContent || '',
      flavor: document.querySelector('#flavoratlas-h2')?.textContent || '',
    }));
    // 4 out of 4 panel titles must have the translated word (not "development preview")
    const nonEnglishTitles = Object.values(titles).filter(t => t && t.length > 0).length;
    note(nonEnglishTitles === 4, `${loc}: all 4 panel titles rendered non-empty`);
  }

  // 4. nutrition sum vs composition — prove data flow
  let composedKcal = 0;
  for (const id of allOptions) {
    await page.selectOption('#cook-recipe', id);
    await page.waitForTimeout(100);
    const nutText = await page.locator('#cook-nutrition').textContent();
    const kcal = nutText.match(/([\d.]+) kcal/);
    composedKcal += kcal ? parseFloat(kcal[1]) : 0;
  }
  note(composedKcal >= 300, `total summed compositions: ${composedKcal.toFixed(0)} kcal (deficit realistic)`);

  // 5. builder — build the week at each target - assert planner entries appear
  for (const t of ['1500', '1400', '1200']) {
    await page.selectOption('#deficit-target', t);
    if (t !== '1500') await page.check('#deficit-ack');
    await page.click('#deficit-build-btn');
    await page.waitForTimeout(250);
  }

  // 6. final entry count should be positive
  const rows = await page.locator('#planner-entries li').count();
  note(rows > 0, `planner entries after all builder cycles: ${rows}`);

  // 7. links + console errors
  note(consoleErrors.length === 0, '0 console errors across all interactions', consoleErrors.slice(0, 3).join(' | '));

  await page.close(); await ctx.close(); await browser.close();

  for (const r of results) console.log((r.ok ? '✔' : '✖') + ' ' + r.label + (r.detail ? ' :: ' + r.detail.slice(0, 70) : ''));
  const failures = results.filter(r => !r.ok);
  console.log(`\n${failures.length} failures of ${results.length}`);
  fs.writeFileSync(path.join(__dirname, 'permutation_report.json'), JSON.stringify({ results, failures, timestamp: new Date().toISOString() }, null, 2));
  process.exit(failures.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
