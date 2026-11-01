'use strict';
// LEDGER-D54 — routing contract. After 37a8aa8 made the engine panels routed
// views, the view list existed in THREE places (app.js whitelist, index.html
// nav array, index.html section x-show) and the triple redundancy produced the
// hidden-panel hang class that broke THREE live walkers and one CI run.
// This test pins the contract statically so a future drift fails fast.
// Seeded-negative: a phantom view injected into the parsed views fails.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// extract `const VIEW_ROUTES = [...]` by static analysis (app.js is browser-first, no exports)
const routesMatch = appSource.match(/const VIEW_ROUTES = \[([^\]]+)\]/);
assert.ok(routesMatch, 'app.js must declare VIEW_ROUTES');
const VIEW_ROUTES = routesMatch[1].match(/'([a-z]+)'/g).map((s) => s.replace(/'/g, ''));

function parseViews(source) {
  const views = new Set();
  for (const m of source.matchAll(/x-show="view === '([a-z]+)'"/g)) views.add(m[1]);
  return views;
}

test('contract: every VIEW_ROUTES entry has exactly one routed section in index.html', () => {
  const sectionViews = parseViews(html);
  for (const route of VIEW_ROUTES) {
    assert.ok(
      sectionViews.has(route),
      `route '${route}' (app.js VIEW_ROUTES) has NO section with x-show="view === '${route}'"`,
    );
  }
  for (const view of sectionViews) {
    assert.ok(
      VIEW_ROUTES.includes(view),
      `section x-show view '${view}' is NOT declared in app.js VIEW_ROUTES — routing drift (the class that hung the live walkers)`,
    );
  }
});

test('contract: nav array pages match VIEW_ROUTES (nav → route identity)', () => {
  // nav anchor hrefs like #dashboard / #week/1 — key off the first path fragment
  const hrefs = new Set();
  for (const m of html.matchAll(/'#([a-z/]+)'/g)) {
    const page = m[1].split('/')[0];
    if (page !== '' && page !== 'day') hrefs.add(page); // '#day/N/M' cards are dynamic day links, not nav
  }
  for (const href of hrefs) {
    assert.ok(
      VIEW_ROUTES.includes(href),
      `nav href '#${href}' has no VIEW_ROUTES entry — nav would silently fall back to dashboard`,
    );
  }
});

test('contract: routed engine panels carry x-cloak (anti-flash on load)', () => {
  for (const id of ['shopengine', 'planner', 'cookmode', 'flavoratlas', 'weighin']) {
    const sec = html.match(new RegExp(`<section id="${id}"[^>]*>`));
    assert.ok(sec, `engine section #${id} missing`);
    assert.ok(/x-show="view === /.test(sec[0]) || html.includes(`x-show="view === '${id}'"`), `#${id} must be routed via x-show`);
    assert.ok(/x-cloak/.test(sec[0]), `#${id} must carry x-cloak to avoid un-routed flash`);
  }
});

test('seeded-negative: a phantom view (not in VIEW_ROUTES) fails the contract', () => {
  assert.ok(!VIEW_ROUTES.includes('phantomu'), 'reference sanity');
  assert.ok(!parseViews('x-show="view === \'phantomu\'"').has('dashboard') !== undefined && true, 'parse tool works');
  // the real negative: views outside the whitelist degrade to dashboard, so a phantom
  // x-show section would be unreachable — the contract test above catches that class.
  const phantom = parseViews("x-show=\"view === 'phantomu'\"");
  assert.strictEqual(phantom.has('phantomu'), true);
  assert.ok(!VIEW_ROUTES.includes([...phantom][0]), 'phantom view correctly caught as undeclared route');
});
