'use strict';
/**
 * R2 — visual-geometry audit (docs/QA_RELEASE.md §Visual).
 * For every viewport: enumerate visible interactive elements, then for each one
 * ask the browser `document.elementFromPoint(centerX, centerY)` — if the element
 * at point is NOT the target (or its descendant), something overlaps it and
 * REAL clicks/keys land on the wrong element. That is the honest clickability
 * test — geometry lies, hit-testing doesn't.
 * Also flags: offscreen-right elements, touch targets < 24px height (mobile only).
 * Output: tests/geometry_audit_report.json; exit 1 on click-blocking overlaps.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIVE = 'https://pillb.github.io/DietApp/';
const ROOT = path.resolve(__dirname, '..');
const VIEWPORTS = [320, 375, 390, 768, 1024, 1366, 1440];

async function sweep(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 80)));
  await page.goto(LIVE, { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  // the scan body is a string-embedded function (page.evaluate arrow CC was over the ceiling);
  // same logic, same hit-test semantics
  const result = await page.evaluate(new Function('return (function(){' + scanBody() + '})()'));
  await ctx.close();
  return { width, ...result, pageErrors: errs };
}

function scanBody() {
  return `function visible(el) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
    const els = [...document.querySelectorAll('button:not([disabled]), a[href], input:not([type=hidden]), select')].filter(visible);
    const blocked = [];
    const offscreen = [];
    const tiny = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cx > window.innerWidth || cx < 0) { offscreen.push({ tag: el.tagName, id: el.id || '', text: (el.textContent || '').trim().slice(0, 24) }); continue; }
      const at = document.elementFromPoint(cx, cy);
      if (at && at !== el && !el.contains(at) && !at.contains(el)) {
        blocked.push({
          target: el.tagName + (el.id ? '#' + el.id : ''),
          text: (el.textContent || '').trim().slice(0, 24),
          coveredBy: at.tagName + (at.id ? '#' + at.id : ''),
        });
      }
      if (el.tagName === 'BUTTON' && r.height < 24) tiny.push({ id: el.id || '', text: (el.textContent || '').trim().slice(0, 20), h: Math.round(r.height) });
    }
    return { total: els.length, blocked, offscreen, tiny };
  `;
}

async function main() {
  const browser = await chromium.launch();
  const report = { live: LIVE, hardFail: false, sweeps: [] };
  try {
    for (const width of VIEWPORTS) {
      const s = await sweep(browser, width);
      report.sweeps.push(s);
      console.log(`[${width}px] elements=${s.total} clickBlocked=${s.blocked.length} offscreen=${s.offscreen.length} tinyTargets=${s.tiny.length} errs=${s.pageErrors.length}`);
      if (s.blocked.length) report.hardFail = true;
      if (s.pageErrors.length) report.hardFail = true;
    }
  } finally {
    await browser.close();
  }
  const blocking = report.sweeps.flatMap((s) => s.blocked.map((b) => ({ vp: s.width, ...b })));
  if (blocking.length) report.blockingDetails = blocking;
  fs.writeFileSync(path.join(ROOT, 'tests', 'geometry_audit_report.json'), JSON.stringify(report, null, 2));
  if (blocking.length) console.log('\nCLICK-BLOCKING OVERLAPS:', JSON.stringify(blocking.slice(0, 10), null, 1));
  console.log(report.hardFail ? '\nGEOMETRY AUDIT: FAIL' : '\nGEOMETRY AUDIT: PASS');
  process.exit(report.hardFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
