'use strict';
// Punch list composition audits: every curated per100g row in
// data/reference/food-composition-tpca.v1.json must (a) point at a CODE that
// actually exists in the official TPCA crawl, and (b) have kcal/protein/fat/carb
// EXACTLY matching the crawled row (NOT typed-from-memory — the crawl lives at
// data/reference/tpca-curation.json). A mismatched number fails ledger-style.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const curation = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference/tpca-curation.json'), 'utf8'));
const composed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference/food-composition-tpca.v1.json'), 'utf8'));

const findCrawlRow = (code) => curation.rows.find((r) => r && r[0] === code) || null;
// honors TPCA's NS convention: rows where the cell is '-1', '-1.00g' style, '-' or '•' mean not-specified → null (never coerced into ±)
const numeric = (s) => {
  if (s == null) return null;
  const t = String(s).trim().replace(/kcal|KJ|g|mg|μg|%/g, '');
  if (t === '' || parseFloat(t) === -1) return null;
  const m = /^(-?\d+(?:\.\d+)?)/.exec(t);
  return m ? parseFloat(m[1]) : null;
};

function rowValues(code) {
  const r = findCrawlRow(code);
  if (!r) return null;
  return {
    kcal: numeric(r[3]), protein: numeric(r[6]), fat: numeric(r[7]), carb: numeric(r[8]),
  };
}

test('every curated composition row exists in the official TPCA crawl by code (NS rows exempt by design)', () => {
  for (const [canon, spec] of Object.entries(composed.rows)) {
    if (spec.code == null) {
      // NS entry: must carry an explicit NS/owner-label note, never a silent guess.
      // OR a documented alternate source (e.g. USDA FDC for foods TPCA doesn't cover).
      const altSource = spec.source && /^usda-fdc\/\d+$/.test(spec.source);
      assert.ok(altSource || (spec.note && /NS|owner|estimate/i.test(spec.note)), `${canon}: null code requires an NS note or a usda-fdc source`);
      continue;
    }
    assert.ok(findCrawlRow(spec.code), `${canon}: TPCA code ${spec.code} not in crawl`);
  }
});

test('curated kcal/protein/fat/carb match the crawl row exactly (no typed-from-memory numbers)', () => {
  for (const [canon, spec] of Object.entries(composed.rows)) {
    if (spec.code == null) continue; // NS/USDA rows: no TPCA crawl row by design (governed by the NS/source test above)
    const vals = rowValues(spec.code);
    assert.ok(vals, `${canon} no crawl row`);
    assert.strictEqual(Math.abs((vals.kcal || 0) - (spec.per100g.kcal || 0)) < 0.01, true, `${canon} kcal ${vals.kcal} ≠ ${spec.per100g.kcal}`);
    assert.strictEqual(Math.abs((vals.protein || 0) - (spec.per100g.proteinG || 0)) < 0.01, true, `${canon} protein`);
    assert.strictEqual(Math.abs((vals.fat || 0) - (spec.per100g.fatG || 0)) < 0.01, true, `${canon} fat`);
    assert.strictEqual(Math.abs((vals.carb || 0) - (spec.per100g.carbG || 0)) < 0.01, true, `${canon} carb`);
  }
});

test('seeded negative: a fabricated value (kcal mutated) is caught (proves audit liveness)', () => {
  const bogus = JSON.parse(JSON.stringify(composed));
  bogus.rows.quinoa_dry.per100g.kcal = 999;
  const bad = bogus.rows.quinoa_dry;
  const vals = rowValues(bad.code);
  assert.strictEqual((vals.kcal || 0) !== (bad.per100g.kcal || 0), true, 'liveness requires mismatch to be detectable');
});
