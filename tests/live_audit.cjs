'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const LIVE = 'https://pillb.github.io/DietApp/';
const ROOT = path.resolve(__dirname, '..');
const results = [];

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(LIVE, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const allTextStr = await page.evaluate(() => {
    return ['#shopengine', '#planner', '#cookmode', '#flavoratlas'].map(sel => { const el = document.querySelector(sel); return el ? el.textContent : ''; }).join('\n');
  });
  for (const banned of ['Pablo', 'Illescas', 'Nathaly', 'Aguilar', 'CNP 3906', 'pabloillescas']) {
    results.push({ ok: !allTextStr.includes(banned), label: 'PII [' + banned + ']: ' + (allTextStr.includes(banned) ? 'LEAK' : 'clean') });
  }
  const barCount = await page.locator('#flavor-bars g').count().catch(() => 0);
  results.push({ ok: barCount > 0, label: 'flavor_bars: ' + barCount });
  await page.selectOption('#cook-recipe', 'pescado_ajonjoli_diet');
  await page.waitForTimeout(200);
  const stepList = await page.evaluate(() => [...document.querySelectorAll('#cook-steps li')].map((el, i) => ({ idx: i + 1, text: el.textContent.slice(0, 70), hasEsPE: /ES-PE:/.test(el.textContent) })));
  for (const s of stepList) {
    results.push({ ok: s.hasEsPE, label: 'step_' + s.idx + ' esPE: ' + s.hasEsPE, detail: s.text });
  }
  results.push({ ok: stepList.length >= 3, label: 'cook_steps_count: ' + stepList.length });
  const nutText = await page.locator('#cook-nutrition').textContent();
  results.push({ ok: /computed-pending-weighin/.test(nutText), label: 'nutrition label present', detail: nutText.trim().slice(0, 70) });
  const kcalMatch = nutText.match(/(\d+(?:\.\d+)?) kcal/);
  results.push({ ok: kcalMatch !== null && parseFloat(kcalMatch[1]) > 0, label: 'nutrition kcal=' + (kcalMatch ? kcalMatch[1] : 'none') });
  const sw = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  results.push({ ok: sw >= 1, label: 'sw_registered: ' + sw });
  const dictValid = await page.evaluate(() => window.I18N ? window.I18N.validateDict() : { missing: ['not loaded'] });
  results.push({ ok: dictValid.missing && dictValid.missing.length === 0, label: 'i18n_valid (missing=' + JSON.stringify(dictValid.missing || []) + ')' });
  const subfiles = ['data/canonical/docx-diet-recipes-canon.v1.json', 'data/reference/food-composition-tpca.v1.json', 'data/fixtures/lima-stores-v1.json', 'data/fixtures/ingredient-bridge-v1.json', 'data/fixtures/flavor-lexicon-v1.json', 'data/reference/tpca-curation.json'];
  for (const f of subfiles) {
    const res = await page.request.get(LIVE + f);
    results.push({ ok: res.status() === 200, label: 'subfile_200: ' + f + ' -> ' + res.status() });
  }
  await browser.close();
  for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.label + (r.detail ? ' :: ' + r.detail.slice(0, 70) : ''));
  const failures = results.filter(r => !r.ok);
  console.log('\n' + failures.length + ' failures of ' + results.length + ' checks');
  fs.writeFileSync(path.join(__dirname, 'audit_report.json'), JSON.stringify({ results, failures, timestamp: new Date().toISOString() }, null, 2));
  process.exit(failures.length > 0 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
