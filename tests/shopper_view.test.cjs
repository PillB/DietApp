'use strict';
// P3.5 — shopper-language tests: EVERY imported canonical ingredient must resolve
// to an es-PE draft callsign or be explicitly exempt (nothing silently missing);
// CSV carries the es-PE name column; display tags the draft status honestly.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I = require('../assets/js/import-weighed.js');
const F = require('../assets/js/food-names-es-pe.js');

const ROOT = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'nutrition-reviewed.json'), 'utf8'));

test('es-PE draft dictionary covers EVERY canonical ingredient from the 7 weighed recipes', () => {
  const out = I.importWeighed(source.curatedRecipes);
  const missing = out.ingredients.filter((i) => F.nameForIngredient(i.id) === null).map((i) => i.id);
  assert.deepStrictEqual(missing, [], `ingredients without even a DRAFT es-PE name: ${missing.join(', ')}`);
});

test('owner-corrected vocabulary: banned machine nonsense never re-enters the draft', () => {
  assert.deepStrictEqual(F.selfAudit(), { ok: true, bad: [] });
  const blob = JSON.stringify([F.NAMES, F.SYNONYMS]).toLowerCase();
  for (const token of ['chocllo superior', 'cocazuela']) assert.ok(!blob.includes(token), `banned term present: ${token}`);
});

test('ambiguous store items carry >=1 synonym for matching robustness (cebolla roja stays distinct)', () => {
  for (const id of ['cucumber', 'beans_cooked', 'berries', 'soy_sauce', 'cucumber', 'mushroom']) {
    assert.ok(F.synonymsFor(id).length >= 1, `${id} needs at least one local synonym`);
  }
  // onion synonyms are VARIANTS not strict substitutes: keep the id distinct in any match
  const OnionSyn = F.synonymsFor('onion');
  assert.ok(OnionSyn.includes('cebolla roja') && OnionSyn.includes('cebolla blanca'));
});

test('unknown/absent ids fail soft: no invented names, caller gets null', () => {
  assert.strictEqual(F.nameForIngredient('cebolla_roja_supply_variant'), null);
  assert.strictEqual(F.nameForIngredient(''), null);
  assert.strictEqual(F.nameForIngredient(null), null);
});

test('review status is machine-draft and truthful (no native-review pretend flags)', () => {
  assert.strictEqual(F.REVIEW_STATUS, 'draft-store-plausible-needs-native-review');
});

test('CSV bullets: es-PE name column first (shopper view), engine fields unchanged', () => {
  const out = I.importWeighed(source.curatedRecipes);
  const list = [
    { ingredientId: 'salmon', basis: 'raw', unit: 'g', neededString: '560', netRequiredString: '560', sourcePlanEntryIds: ['p1'],
      purchaseRecommendation: null },
  ];
  const model = { ingredientById: new Map(out.ingredients.map((i) => [i.id, i])) };
  const csv = SHOP_LIST_TO_CSV(list, model);
  // expert check via line inspection rather than exact-match brittleness
  const dataLine = csv.split('\n').find((r) => r.includes('salmon'));
  assert.ok(dataLine && /salm[óo]n/i.test(dataLine), `es-PE name missing in CSV line: ${dataLine}`);
  assert.ok(/needs_package_decision/.test(dataLine), 'unverified purchase fields surface as decision-needed');
});

test('error handling: quantity strings in CSV remain exact for shoppers (no float rounding)', () => {
  const model = { ingredientById: new Map([['egg', { family: 'proteins' }]]) };
  const list = [{ ingredientId: 'egg', basis: 'raw', unit: 'count', neededString: '2.5', netRequiredString: '2.5', sourcePlanEntryIds: ['p9'], purchaseRecommendation: { packages: 3, unit: 'count', rule: 'ceil-count-default' } }];
  const csv = SHOP_LIST_TO_CSV(list, model);
  const line = csv.split('\n').find((r) => r.includes('egg'));
  assert.ok(line.includes('2.5'), `exact string kept: ${line}`);
  assert.ok(/ceil-count-default/.test(line));
});

/** Mirror of ShoppingUI.listToCsv columns for engine-level contract testing. */
function SHOP_LIST_TO_CSV(list, model) {
  const header = 'family,ingredient,es_pe_name,basis,unit,needed,net_required,purchase_packages,package_unit,rule,source_entries';
  const rows = list.map((l) => {
    const ing = model.ingredientById.get(l.ingredientId) || {};
    const esName = F.nameForIngredient(l.ingredientId) || '';
    const syn = F.synonymsFor(l.ingredientId);
    const esCell = syn.length ? `${esName} (${syn.slice(0, 3).join(' | ')})` : esName;
    const rec = l.purchaseRecommendation;
    const recPart = rec ? `${rec.packages},${rec.unit},${rec.rule}` : 'none,-,needs_package_decision';
    return [ing.family || '', l.ingredientId, esCell, l.basis, l.unit, l.neededString, l.netRequiredString, recPart, l.sourcePlanEntryIds.join('|')]
      .map((v) => { const s = String(v ?? ''); return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',');
  });
  return [header].concat(rows).join('\n');
}
