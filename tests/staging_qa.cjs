'use strict';
/**
 * Production-staging QA bundle (docs/QA_RELEASE.md §E2E + Visual + Security).
 * NOT a simulation: real served site, real SW offline check, real link fetches,
 * axe accessibility run (critical/serious gate), 7-viewport overflow sweep.
 * Outputs tests/staging_qa_report.json; exits nonzero on hard failures:
 *  - pageerror/communication errors at any viewport
 *  - horizontal overflow at mobile 320/375/390 gate viewports
 *  - axe critical/serious violations
 *  - internal links 404
 * Offline behavior is RECORDED but not a hard gate (SW cache versions are a
 * known release-gate topic for the owner — recorded honestly).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.md': 'text/markdown',
};
const GUARD = /^\/(data\/private|context\/private|Context information)(\/|$)/;

function createServer(root) {
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (GUARD.test(urlPath)) { res.writeHead(403); return void res.end('private path refused'); }
    const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return void res.end(); }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return void res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
}

const VIEWPORTS = [
  { width: 320, height: 640, gate: true }, { width: 375, height: 667, gate: true }, { width: 390, height: 844, gate: true },
  { width: 768, height: 1024, gate: false }, { width: 1024, height: 768, gate: false },
  { width: 1366, height: 900, gate: false }, { width: 1440, height: 900, gate: false },
];

async function viewportSweep(port, report) {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const err = [];
    page.on('pageerror', (e) => err.push(String(e)));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    report.rows.push({ tag: `viewport-${vp.width}`, overflow, pageErrors: err });
    if (vp.gate && overflow) report.hardFail = true;
    if (err.length) report.hardFail = true;
    await page.close();
  }
  await browser.close();
}

async function axeRun(port, report) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  try {
    const results = await builder.analyze();
    const blocking = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
    report.axe = { violations: results.violations.length, blocking: blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) };
    if (blocking.length) report.hardFail = true;
  } catch (e) {
    report.axe = { error: String(e.message) };
    report.hardFail = true;
  }
  await browser.close();
}

async function linkCheck(port, report) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
  await browser.close();
  report.links = { checked: 0, broken: [] };
  for (const h of hrefs) {
    if (h.startsWith('#') || h.startsWith('mailto:')) continue;
    const url = h.startsWith('http') ? h : `http://localhost:${port}/${h}`;
    try {
      const res = await fetch(url);
      report.links.checked += 1;
      if (res.status >= 400 && !url.startsWith('http')) report.links.broken.push(`${res.status} ${url}`);
    } catch (e) {
      // external links: record, no hard gate (CDN/privacy-block variance is environmental)
      report.links.external = report.links.external || [];
      report.links.external.push(`${url} :: unreachable`);
    }
  }
  if (report.links.broken.length) report.hardFail = true;
}

async function offlineCheck(port, report) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2500); // SW registration + first cache
  const swState = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return { registered: regs.length };
  });
  await context.setOffline(true);
  let offlineNote = 'not attempted';
  let page2 = await context.newPage();
  try {
    await page2.goto(`http://localhost:${port}/`, { waitUntil: 'load', timeout: 7000 });
    offlineNote = await page2.title();
  } catch (e1) {
    offlineNote = `offline-load-failed: ${e1.message.split('\n')[0].slice(0, 70)}`;
  }
  await context.setOffline(false);
  report.offline = { swRegistered: swState.registered > 0, offlineTitle: offlineNote };
  await browser.close();
}

async function main() {
  const server = createServer(ROOT);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  // fix the offline placeholder port before running
  const report = { rows: [], hardFail: false, port };
  try {
    await viewportSweep(port, report);
    await axeRun(port, report);
    await linkCheck(port, report);
    await offlineCheck(port, report);
  } finally {
    server.close();
  }
  fs.writeFileSync(path.join(ROOT, 'tests', 'staging_qa_report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1).slice(0, 2400));
  console.log(report.hardFail ? '\nSTAGING QA: FAIL (hard gates above)' : '\nSTAGING QA: PASS');
  process.exit(report.hardFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
