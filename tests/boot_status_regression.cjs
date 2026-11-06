'use strict';
/* Regression for issue #7: engine panels must never remain invisibly blank.
 * Verifies (a) a slow fixture keeps a visible loading state and still boots, and
 * (b) missing engine UI dependencies show a localized failure with retry. */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function startServer() {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (name.includes('..') || /^\/(data\/private|context\/private)(\/|$)/.test(name)) {
        res.writeHead(403);
        return res.end('forbidden');
      }
      const file = path.resolve(ROOT, '.' + name);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404);
        return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    } catch (error) {
      res.writeHead(400);
      res.end(String(error));
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function assertVisible(locator, label) {
  const visible = await locator.isVisible().catch(() => false);
  if (!visible) throw new Error(`${label} expected a visible boot status`);
}

async function main() {
  const server = await startServer();
  const port = server.address().port;
  let browser = await chromium.launch();
  const results = [];
  try {
    await browser
      .newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-PE' })
      .then(async (ctx) => {
        const page = await ctx.newPage();
        await page.route(/lima-stores-v1\.json$/, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          await route.continue();
        });
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await assertVisible(page.locator('#engine-boot-status'), 'loading');
        const loadingText = await page.locator('#engine-boot-message').innerText();
        const retryHidden = (await page.locator('#engine-boot-retry').evaluate((el) => getComputedStyle(el).display)) === 'none';
        if (!loadingText || !retryHidden) throw new Error('loading state must be text-only until failure');
        await page.locator('#engine-recipe option').first().waitFor({ state: 'attached', timeout: 15000 });
        const statusHidden = (await page.locator('#engine-boot-status').evaluate((el) => getComputedStyle(el).display)) === 'none';
        if (!statusHidden) throw new Error('successful boot must hide the loading status');
        const recipes = await page.locator('#engine-recipe option').count();
        if (recipes === 0) throw new Error('engine recipe control should populate after boot');
        results.push({ case: 'slow-fixture-loads', recipes, loadingText });
        await ctx.close();
      });

    await browser.close();
    browser = await chromium.launch();
    const failCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-PE' });
    const failPage = await failCtx.newPage();
    const engineUis = /\/assets\/js\/(shopping-ui|planner-ui|cook-mode-ui|flavor-ui|weighin-ui)\.js$/;
    await failPage.route(engineUis, (route) => route.abort());
    await failPage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 30000 });
    await failPage.locator('#engine-boot-status').waitFor({ state: 'visible', timeout: 25000 });
    await failPage.locator('#engine-boot-retry').waitFor({ state: 'visible', timeout: 25000 });
    const failedText = await failPage.locator('#engine-boot-message').innerText();
    const retryVisible = await failPage.locator('#engine-boot-retry').isVisible();
    const debug = await failPage.evaluate(() => ({
      message: document.getElementById('engine-boot-message')?.innerText,
      retryDisplay: document.getElementById('engine-boot-retry') ? getComputedStyle(document.getElementById('engine-boot-retry')).display : 'missing',
      boxDisplay: document.getElementById('engine-boot-status') ? getComputedStyle(document.getElementById('engine-boot-status')).display : 'missing',
      globals: ['ShoppingUI', 'PlannerUI', 'CookModeUI', 'FlavorUI', 'WeighInUI'].filter((name) => typeof window[name] !== 'undefined'),
    }));
    if (!failedText || !retryVisible) throw new Error(`missing-dependencies state must show retry: ${JSON.stringify(debug)}`);
    results.push({ case: 'missing-dependencies-fails-visible', failedText });
    await failCtx.close();
  } finally {
    await browser.close();
    server.close();
  }

  console.log(JSON.stringify({ ok: true, results }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
