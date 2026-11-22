'use strict';
// Real browser state-machine integration: click every visible nav after every
// write, then assert canonical persisted state and computed shopping coherence.
// Contradictions in editorial demo pages are explicitly called out, NOT hidden.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml' };
const ROUTES = ['#dashboard', '#calendar', '#week/1', '#day/1/0', '#recipes',
  '#shopping/1', '#nutrition', '#planner', '#shopengine', '#cookmode',
  '#weighin', '#knowledge'];

function staticServer() {
  return http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent((req.url || '/').split('?')[0]); }
    catch { res.writeHead(400); res.end('bad URL'); return; }
    const requested = rel === '/' ? 'index.html' : rel.replace(/^\/+/, '');
    const file = path.resolve(ROOT, requested);
    if (!file.startsWith(ROOT + path.sep) || /^\/?(?:data\/private|context\/private)\//.test(rel)) {
      res.writeHead(403); res.end('forbidden'); return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
}

async function ready(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const select = document.getElementById('engine-recipe');
    return Boolean(window.StorageCore && select && select.options.length > 0);
  }, null, { timeout: 20000 });
}

async function records(page) {
  return page.evaluate(() => {
    const result = window.StorageCore.load(localStorage);
    if (!result.ok) throw new Error('failed to load canonical state: ' + result.error.code);
    return result.state.planEntries;
  });
}

async function clickRoute(page, route) {
  if (route === '#day/1/0') {
    await page.locator('nav a[href="#week/1"]').first().click();
    await page.locator('a[href="#day/1/0"]').first().click();
  } else {
    await page.locator('nav a[href="' + route + '"]').first().click();
  }
  await page.waitForFunction((value) => location.hash === value, route);
}

async function sweep(page, expectedCount, expectedShopping, notes) {
  for (const route of ROUTES) {
    await clickRoute(page, route);
    const entries = await records(page);
    assert.equal(entries.length, expectedCount, route + ' must retain the same canonical plan');
    if (route === '#calendar') {
      const note = await page.locator('section[x-show="view === \'calendar\'"] [role="note"]').textContent();
      assert.match(note, /editorial de ejemplo/i, 'fixed calendar MUST declare it is not the saved plan');
    }
    if (route === '#planner') {
      assert.equal(await page.locator('#planner-entries li[data-entry]').count(), expectedCount,
        'Planner visible rows must agree with the canonical plan');
    }
    if (route === '#shopengine' && expectedShopping !== null) {
      const lines = await page.locator('#engine-groups li').count();
      assert.equal(lines > 0, expectedShopping, 'shop list must be recomputed for the selected date range');
    }
    notes.push({ route, entries: expectedCount });
  }
}

async function setNav(page, route) {
  await clickRoute(page, route);
  await page.locator(route === '#planner' ? '#planner-h2' : '#engine-recipe')
    .waitFor({ state: 'visible' });
}

async function addMeal(page, date, portions) {
  await setNav(page, '#shopengine');
  await page.locator('#engine-date').fill(date);
  await page.locator('#engine-portions').fill(String(portions));
  await page.selectOption('#engine-recipe', 'nikkei-salmon-bowl');
  await page.locator('#engine-plan-form button[type="submit"]').click();
}

async function main() {
  const server = staticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port + '/';
  const report = { at: new Date().toISOString(), cases: [], routeVisits: [], pageErrors: [] };
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 850 },
      timezoneId: 'America/Lima' });
    const a = await ctx.newPage();
    a.on('pageerror', (e) => report.pageErrors.push('A:' + e.message));
    await ready(a, base);
    assert.equal((await records(a)).length, 0, 'fresh user must have no phantom canonical meals');
    report.cases.push('fresh origin empty');
    const [date, end, moved] = await a.evaluate(() => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const today = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());
      const next = CalendarCore.nextMonday(today);
      const later = new Date(next + 'T12:00:00');
      later.setDate(later.getDate() + 7);
      const shifted = later.getFullYear() + '-' + pad(later.getMonth()+1) + '-' + pad(later.getDate());
      return [next, CalendarCore.weekOf(next)[6], shifted];
    });
    await setNav(a, '#shopengine');
    await a.locator('#engine-from').fill(date);
    await a.locator('#engine-to').fill(end);
    await addMeal(a, date, 2);
    assert.equal((await records(a)).length, 1);
    await sweep(a, 1, true, report.routeVisits);
    report.cases.push('add: persisted and routes coherent');

    await setNav(a, '#planner');
    const firstId = (await records(a))[0].id;
    await a.locator('#planner-entries li[data-entry]').first().locator('[data-op="move"]').fill(moved);
    assert.equal((await records(a))[0].localDate, moved);
    assert.equal((await records(a))[0].id, firstId);
    await sweep(a, 1, false, report.routeVisits);
    report.cases.push('move: ID preserved, old shopping range decreases');

    await setNav(a, '#planner');
    const first = a.locator('#planner-entries li[data-entry]').first();
    await first.locator('[data-op="copydate"]').fill(date);
    await first.locator('[data-op="copy"]').click();
    assert.equal((await records(a)).length, 2);
    await sweep(a, 2, true, report.routeVisits);
    report.cases.push('copy: distinct persisted entry, shopping recomputed');

    await setNav(a, '#planner');
    const row = a.locator('#planner-entries li[data-entry]').first();
    await row.locator('[data-op="weeks"]').fill('2');
    await row.locator('[data-op="repeat"]').click();
    assert.equal((await records(a)).length, 4, 'repeat of source adds two new dated occurrences');
    await sweep(a, 4, true, report.routeVisits);
    report.cases.push('repeat: two extra dates, no loss in old date range');

    await setNav(a, '#planner');
    await a.locator('#planner-entries li[data-entry]').first().locator('[data-op="del"]').click();
    assert.equal((await records(a)).length, 3);
    await sweep(a, 3, true, report.routeVisits);
    report.cases.push('delete: canonical and computed list agree');

    const b = await ctx.newPage();
    b.on('pageerror', (e) => report.pageErrors.push('B:' + e.message));
    await ready(b, base);
    await setNav(b, '#planner');
    assert.equal(await b.locator('#planner-entries li[data-entry]').count(), 3);
    await addMeal(a, date, 1);
    await b.waitForFunction(() => document.querySelectorAll('#planner-entries li[data-entry]').length === 4,
      null, { timeout: 7000 });
    assert.equal((await records(b)).length, 4);
    await sweep(a, 4, true, report.routeVisits);
    report.cases.push('two tabs: storage event updates the other tab');

    // Seeded quota fault MUST fail user-visible save; never call operation success.
    await a.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'pgk-state-v1') throw new DOMException('seeded quota', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    const before = await records(a);
    await addMeal(a, date, 2);
    const after = await records(a);
    assert.deepEqual(after, before, 'quota fault must roll back plan change');
    assert.match(await a.locator('#engine-status').textContent(), /storage_write_failed/);
    await sweep(a, 4, true, report.routeVisits);
    report.cases.push('quota fault: rollback and diagnostics across routes');

    assert.deepEqual(report.pageErrors, [], 'no uncaught browser exception permitted');
    await b.close(); await ctx.close();
    fs.writeFileSync(path.join(ROOT, 'tests/state_cross_page_report.json'), JSON.stringify(report, null, 2));
    console.log('CROSS-PAGE PASS:', report.cases.join(' | '), 'navigation checks:', report.routeVisits.length);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}
main().catch((error) => { console.error('CROSS-PAGE FAIL:', error.stack || error); process.exitCode = 1; });
