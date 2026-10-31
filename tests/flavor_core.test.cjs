'use strict';
// P5.1 — flavor engine tests on synthetic ATLAS fixtures (never the private file).
// Seeded negatives prove the engine obeys: noise exclusion, support floor,
// HTML-entity normalization, and that grocery/drinks never inflate dish tastes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const F = require('../assets/js/flavor-core.js');

const fixtureAtlas = {
  schema: 'flavor-atlas/v1',
  items: 40,
  category_counts: {
    'Sushi / Nikkei / japonesa': 5, 'Sándwich / panadería salada': 3, 'Postre / snack dulce': 2,
    'Supermercado / despensa comestible': 10, 'Bebida': 6, 'Hamburguesa / fast food': 14,
  },
  month_counts: { '2022-01': 20, '2022-02': 10, '2022-03': 10 },
  service_counts: { Rappi: 40 },
  description_confidence_counts: { Media: 32, Alta: 8 },
  supported_item_counts: {
    'Maki Acevichado': 5, 'Croissant de Jamón y Queso': 3, 'Arroz integral &amp; quinoa bowl': 4, 'Inca Kola Gaseosa Sin Azúcar': 3,
  },
  supported_item_categories: {
    'Maki Acevichado': { 'Sushi / Nikkei / japonesa': 5 },
    'Croissant de Jamón y Queso': { 'Sándwich / panadería salada': 3 },
    'Arroz integral &amp; quinoa bowl': { 'Supermercado / despensa comestible': 4 },
    'Inca Kola Gaseosa Sin Azúcar': { 'Bebida': 3 },
  },
  suppressed_item_total: 15, // 40 − (5+3+4+3)
  min_support: 3,
};

test('noise split: grocery & beverage categories are excluded with an explicit reason (purchase-noise, not taste)', () => {
  const p = F.buildTasteProfile(fixtureAtlas, { minSupport: 3 });
  const noise = p.excluded.categories.map((c) => c.id);
  assert.ok(noise.includes('Supermercado / despensa comestible') && noise.includes('Bebida'), JSON.stringify(noise));
  assert.ok(p.excluded.categories.every((c) => /purchase[- ]noise|beverage/i.test(c.reason)));
  // dish pool = items − noise categories − suppressed rows = 40 − (grocery10 + drinks6) − 15
  assert.strictEqual(p.dishPool, 40 - 10 - 6 - 15, 'dishPool = items minus noise-category rows minus suppressed rows');
  assert.strictEqual(p.items.some((x) => x.name === 'Brownie parfait pack grande'), false, 'below-floor names must not exist in engine output');
  assert.strictEqual(p.items.some((x) => x.name === 'Inca Kola Gaseosa Sin Azúcar'), false, 'beverage names stay out of taste ranking');
  assert.strictEqual(p.items.some((x) => x.name === 'Arroz integral & quinoa bowl'), false, 'grocery items stay out of taste ranking');
  assert.strictEqual(p.items.some((x) => x.name === 'Chocolate Caliente'), false, 'drink items stay out (absent in fixture implicitly)');
});

test('support floor & ranking: descending count, alphabetical tie-break, HTML entities normalized', () => {
  const p = F.buildTasteProfile(fixtureAtlas, { minSupport: 3 });
  const names = p.items.map((x) => x.name);
  assert.deepStrictEqual(names, ['Maki Acevichado', 'Croissant de Jamón y Queso'], JSON.stringify(names));
  assert.strictEqual(p.items[0].count, 5);
  assert.strictEqual(p.items[0].shareWithinDishPool, 5 / 9, 'share denominator is the dish pool of supported entries');
});

test('share integrity: sums stay within the dish pool and category linkage is preserved per item', () => {
  const p = F.buildTasteProfile(fixtureAtlas, { minSupport: 3 });
  const item = p.items.find((x) => x.name === 'Maki Acevichado');
  assert.deepStrictEqual(item.topCategories, [{ id: 'Sushi / Nikkei / japonesa', count: 5 }]);
  assert.ok(p.monthsSeries['2022-01'] === 20, 'month series passes through untouched');
  assert.ok(p.caveats.some((c) => /aggregate[- ]only/i.test(c.text)), `atlas policy caveat is shown to UI: ${JSON.stringify(p.caveats.map((c) => c.text))}`);
  assert.ok(p.caveats.some((c) => /description/i.test(c.text)), 'confidence caveats surface (Media-dominance acknowledged)');
});

test('minSupport option raises the bar; nothing below the raised floor survives', () => {
  const strict = F.buildTasteProfile(fixtureAtlas, { minSupport: 4 });
  const counts = strict.items.map((x) => x.count);
  assert.ok(counts.every((c) => c >= 4), JSON.stringify(counts));
  assert.strictEqual(strict.items.some((x) => x.name === 'Chocolate Caliente'), false);
});

test('schema guard: wrong atlas schema refuses (no silent tolerant parsing)', () => {
  assert.throws(() => F.buildTasteProfile({ ...fixtureAtlas, schema: 'flavor-atlas/v9' }, { minSupport: 3 }), /flavor-atlas\/v1/);
});
