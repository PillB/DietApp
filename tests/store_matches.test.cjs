'use strict';
// P3.3 — Lima store catalog fixture + matcher tests. The fixture must remain
// structure-only; any invented title/price/stock claim is a test failure.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../assets/js/domain-schema.js');
const M = require('../assets/js/store-matches.js');
const Q = require('../assets/js/quantity.js');
const SHOP = require('../assets/js/shopping-core.js');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fixtures/lima-stores-v1.json'), 'utf8')).products;

test('fixture: every row is schema-valid, structure-only (no titles/prices/stock claims)', () => {
  assert.ok(catalog.length >= 10, `too few structure rows: ${catalog.length}`);
  for (const p of catalog) {
    const v = S.validateStoreProduct(p);
    assert.deepStrictEqual(v.errors, [], `${p.id}: ${JSON.stringify(v.errors)}`);
    assert.strictEqual(p.availability, 'notChecked');
    assert.strictEqual(p.pricePEN, null, 'no invented prices');
    assert.strictEqual(p.listingTitle, null, 'no invented titles');
    assert.strictEqual(p.observationTime, null, 'no invented observations');
    assert.strictEqual(p.sku, null);
    assert.strictEqual(p.productUrl, null);
    assert.ok(p.hypothesisPack, 'hypothesis pack present and clearly not provenance');
  }
});

test('matchLine: exact canonical-id candidates only; recommended stays null (nothing verified)', () => {
  const r = M.matchLine({ ingredientId: 'brown_rice_dry', unit: 'g' }, catalog);
  assert.ok(r.matches.length >= 3, 'Wong+Plaza Vea+Metro structural candidates');
  assert.strictEqual(r.recommended, null, 'no match is promoted before live verification');
  for (const m of r.matches) assert.strictEqual(m.availability, 'notChecked', 'never upgraded by matcher');
  assert.ok(r.matches.every((m) => !m.usableForPurchaseMath), 'no recorded packaging yet → not purchase math');
});

test('distinct-ingredient discipline: another-allium or different-brand rows must NOT match red onion', () => {
  const strangers = [{ ...catalog[0], id: 'sp-wong-onion-white-hyp', ingredientId: 'brown_rice_dry' }]; // wrong id by construction
  const r = M.matchLine({ ingredientId: 'red_onion', unit: 'count' }, strangers);
  assert.strictEqual(r.matches.length, 0);
  assert.ok(r.warnings.some((w) => w.code === 'no_catalog_match_search_link_needed'));
});

test('verifiedPackages derives ONLY from recorded packages; hypothesisPack never leaks to math', () => {
  assert.deepStrictEqual(M.verifiedPackages(catalog), {}, 'fixture packs are hypotheses');
  const withRecorded = [{ ...catalog[0], packageQty: 1000, packageUnit: 'g' }];
  const pk = M.verifiedPackages(withRecorded);
  assert.deepStrictEqual(pk.brown_rice_dry, { quantity: '1000', unit: 'g' });
});

test('integration: recorded 1 kg packaging changes purchase advice to recorded-package (2 packs for 1250 g)', () => {
  const recorded = catalog.map((p) => (p.ingredientId === 'brown_rice_dry' ? { ...p, packageQty: 1000, packageUnit: 'g' } : p));
  const pkgMap = M.verifiedPackages(recorded);
  const recipes = [{
    id: 'rice_bowl', version: 1, recipeKind: 'meal', validationStatus: 'reviewPending', originalSource: 'test',
    baseServings: 4, yieldCookedG: null, equipment: [],
    times: { activeMin: 5, passiveMin: 5, pressureMin: null, releaseMin: null },
    ingredients: [{ ingredientId: 'brown_rice_dry', quantity: '500', unit: 'g', basis: 'dry', optional: false }],
    steps: [], nutrition: { perServing: null, sourceIds: [], status: 'not-assessed' }, flavorTags: [],
  }];
  const out = SHOP.buildShoppingList({
    recipes,
    planEntries: [{ id: 'p1', localDate: '2026-11-01', slot: 'dinner', recipeId: 'rice_bowl', version: 1, portions: 10, repeatRuleId: null, pantryOverride: null }],
    from: '2026-11-01', to: '2026-11-30', packages: pkgMap,
  });
  const line = out.lines.find((l) => l.ingredientId === 'brown_rice_dry');
  assert.ok(Q.eq(line.needed, Q.parseExact('1250')), JSON.stringify(line));
  assert.ok(Q.eq(line.purchaseRecommendation.quantity, Q.parseExact('2')), '1250 g ÷ 1000 g → ceil = 2 packages');
  assert.strictEqual(line.purchaseRecommendation.rule, 'recorded-package');
});

test('stock claims without provenance stay impossible at schema level (state ladder respected)', () => {
  const original = catalog[0];
  const claimed = { ...original, availability: 'listedForLocation' };
  const codes = S.validateStoreProduct(claimed).errors.map((e) => e.code);
  assert.ok(codes.includes('claim_missing_observation_time') && codes.includes('claim_missing_listing_title') && codes.includes('claim_missing_product_url'), JSON.stringify(codes));
  const priced = { ...original, pricePEN: 6.9 };
  const pricedCodes = S.validateStoreProduct(priced).errors.map((e) => e.code);
  assert.ok(pricedCodes.includes('price_missing_observation_time') && pricedCodes.includes('price_missing_locale') && pricedCodes.includes('price_missing_sku_or_url'), JSON.stringify(pricedCodes));
});

test('matcher ignores schema-invalid catalog rows with an audit warning (not silently)', () => {
  const broken = [{ ...catalog[0], id: 'SP TERRIBLE', retailer: 'BigBasket', availability: 'meh' }];
  const r = M.matchLine({ ingredientId: 'brown_rice_dry', unit: 'g' }, broken);
  assert.ok(r.warnings.some((w) => w.code === 'invalid_catalog_rows_ignored' && w.count === 1));
});
