'use strict';
/** Independent live GitHub Pages observation. Screenshots record main (not PR) until merged. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const LIVE = process.env.LIVE_URL || 'https://pillb.github.io/DietApp/';
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests/screenshots/live-pages-independent');
const ROUTES = ['#dashboard','#calendar','#week/1','#recipes','#shopping/1',
  '#compliance','#nutrition','#knowledge','#shopengine','#planner','#cookmode','#flavoratlas','#weighin'];
const ENGINES = new Set(['shopengine','planner','cookmode','flavoratlas','weighin']);
fs.mkdirSync(OUT, { recursive: true });
const report = { live: LIVE, checkedAt: new Date().toISOString(), routes: [], interactions: [], errors: [], screenshots: [], warnings: [] };
function record(value, array='interactions') { report[array].push(value); }
function safe(name) { return name.replace(/[^a-z0-9-]/gi, '-'); }
function targetFor(page, name) {
  return ENGINES.has(name) ? page.locator('#' + name) : page.locator(`section[x-show="view === '${name}'"]`);
}
async function inventory(page) {
  return page.evaluate(() => [...document.querySelectorAll('button,a[href],input,select,textarea')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }).map(el => ({
    tag:el.tagName.toLowerCase(), id:el.id || null, type:el.type || null,
    text:(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0,120),
    options:el.tagName==='SELECT' ? [...el.options].map(o => ({value:o.value,text:o.text})) : null
  })));
}
async function screenshot(page, label) {
  const file = path.join(OUT, safe(label) + '.png');
  await page.screenshot({ path:file, animations:'disabled', fullPage:false });
  report.screenshots.push(path.relative(ROOT, file));
}
async function openMobileNavigation(page) {
  const toggle = page.locator('#mobile-nav-toggle');
  if (await toggle.count() && await toggle.getAttribute('aria-expanded') === 'false') {
    await toggle.click();
  }
}
async function observeRoute(page, hash, width) {
  const view = hash.slice(1).split('/')[0];
  await openMobileNavigation(page);
  const nav = page.locator(`nav a[href="${hash}"]`);
  if (!await nav.count()) {record({width,hash,ok:false,reason:'missing_navigation_link'},'routes'); return;}
  await nav.first().click();
  await page.waitForTimeout(650); // screenshot observes settled smooth scroll; NOT a correctness assertion
  const section = targetFor(page,view);
  const visible = await section.isVisible().catch(() => false);
  const rect = visible ? await section.boundingBox() : null;
  const viewport = page.viewportSize();
  const inViewport = Boolean(rect && rect.y < viewport.height && rect.y + rect.height > 0);
  const urlMatches = new URL(page.url()).hash === hash;
  const otherEngines = [];
  for (const engine of ENGINES) if (engine !== view && await page.locator('#' + engine).isVisible()) otherEngines.push(engine);
  const ok = visible && inViewport && urlMatches && otherEngines.length === 0;
  record({width,hash,view,ok,visible,inViewport,urlMatches,otherEngines,controls:await inventory(page)},'routes');
  await screenshot(page, `${width}-${view}`);
}
async function exercise(page, width) {
  await openMobileNavigation(page);
  await page.locator('nav a[href="#recipes"]').first().click();
  const btn = page.locator('section[x-show="view === \'recipes\'"] .grid button').first();
  if (await btn.count()) {
    await btn.click();
    const modal = page.locator('div.fixed.inset-0.z-40');
    const opened = await modal.isVisible();
    await screenshot(page, `${width}-recipe-modal`);
    await page.locator('button[aria-label="Close recipe"]').click();
    await modal.waitFor({ state: 'hidden', timeout: 2500 }).catch(() => {});
    const closed = !(await modal.isVisible());
    record({width,action:'open-close-recipe-modal',ok:opened&&closed});
  }
  await openMobileNavigation(page);
  await page.locator('nav a[href="#shopengine"]').first().click();
  const recipe = page.locator('#engine-recipe');
  if (await recipe.count()) {
    await recipe.selectOption({index:0});
    await page.locator('#engine-portions').fill('4');
    await page.locator('#engine-date').fill('2026-11-03');
    await page.locator('#engine-plan-form').evaluate(form => form.requestSubmit());
    const status = await page.locator('#engine-status').textContent();
    record({width,action:'add-meal-to-shopping',status:status.trim(),ok:Boolean(status.trim())});
    await page.locator('#shopengine').scrollIntoViewIfNeeded();
    await screenshot(page, `${width}-shopping-after-add`);
  }
  await openMobileNavigation(page);
  await page.locator('nav a[href="#cookmode"]').first().click();
  if (await page.locator('#cook-recipe').count()) {
    const values = await page.locator('#cook-recipe option').evaluateAll(xs=>xs.map(x=>x.value));
    for (const value of values) {
      await page.locator('#cook-recipe').selectOption(value);
      const text = await page.locator('#cook-nutrition').textContent();
      record({width,action:'cook-recipe-option',recipe:value,ok:Boolean(text.trim()),nutrition:text.trim().slice(0,120)});
    }
    await page.locator('#cookmode').scrollIntoViewIfNeeded();
    await screenshot(page, `${width}-cooking-card`);
  }
}
async function run() {
  const browser = await chromium.launch();
  try {
    for(const width of [390,1360]) {
      const ctx = await browser.newContext({viewport:{width,height:width===390?844:900},locale:'es-PE'});
      const page = await ctx.newPage();
      page.on('pageerror',e=>report.errors.push({width,type:'pageerror',error:e.message}));
      try {
        const response = await page.goto(LIVE,{waitUntil:'domcontentloaded',timeout:25000});
        if (!response || response.status()>=400) throw new Error('bad Pages HTTP status: '+response?.status());
        await page.waitForTimeout(1800);
        for(const route of ROUTES) await observeRoute(page,route,width);
        await exercise(page,width);
      } catch(e) { report.errors.push({width,type:'walkthrough',error:String(e)}); }
      await ctx.close();
    }
  } finally { await browser.close(); }
  const out = path.join(ROOT,'tests/live_pages_independent_report.json');
  fs.writeFileSync(out,JSON.stringify(report,null,2));
  const fails=report.routes.filter(x=>!x.ok).length+report.interactions.filter(x=>!x.ok).length+report.errors.length;
  console.log(JSON.stringify({live:LIVE,routeCount:report.routes.length,interactionCount:report.interactions.length,screenshots:report.screenshots.length,failures:fails,report:out},null,2));
  process.exitCode=fails?1:0;
}
run().catch(e=>{report.errors.push({type:'fatal',error:String(e)});fs.writeFileSync(path.join(ROOT,'tests/live_pages_independent_report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
