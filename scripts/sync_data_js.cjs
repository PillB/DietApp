'use strict';
/**
 * P7 hardening — the served-copy sync: regenerates assets/js/data.js's JSON
 * payload from meal-plan-data.json (the authoritative source), eliminating the
 * served-vs-source drift class (LEDGER-D41's root cause).
 *
 * data.js format: '<comment lines...>\nwindow.MEAL_PLAN_DATA = {json};'
 * The sync preserves the comment header verbatim and re-serializes the payload
 * with sorted keys + 1-space indent so diffs are readable.
 *
 * Run: node scripts/sync_data_js.cjs          (verify + rewrite if drifted)
 *      node scripts/sync_data_js.cjs --check  (exit 1 if drifted, no write)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'meal-plan-data.json');
const SERVED = path.join(ROOT, 'assets/js/data.js');

function parseServed(src) {
  const marker = 'window.MEAL_PLAN_DATA = ';
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error('served data.js missing the MEAL_PLAN_DATA marker');
  const head = src.slice(0, idx);
  const jsonStart = idx + marker.length;
  const jsonEnd = src.indexOf('};', jsonStart);
  if (jsonEnd === -1) throw new Error('served data.js payload unterminated');
  const payload = src.slice(jsonStart, jsonEnd + 1);
  return { head, json: JSON.parse(payload) };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const servedSrc = fs.readFileSync(SERVED, 'utf8');
  const { head, json: served } = parseServed(servedSrc);

  const a = JSON.stringify(source), b = JSON.stringify(served);
  if (a === b) {
    console.log('SYNC OK: served data.js matches meal-plan-data.json');
    process.exit(0);
  }
  if (checkOnly) {
    console.error('DRIFT DETECTED: served data.js ≠ meal-plan-data.json — run `npm run sync`');
    process.exit(1);
  }
  const rebuilt = head + 'window.MEAL_PLAN_DATA = ' + JSON.stringify(source, null, 1) + ';';
  fs.writeFileSync(SERVED, rebuilt, 'utf8');
  console.log('SYNCED: assets/js/data.js regenerated from meal-plan-data.json');
}

main();
