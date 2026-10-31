'use strict';
// P5.2 — semantic graph core tests on synthetic fixtures (no private data).
// Seeded negatives: dangling edges, wrong kinds, missing provenance, unclamped
// weights — every disgraceful shortcut must throw or refuse with a code.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../assets/js/flavor-graph.js');

const profile = {
  dishPool: 9,
  items: [
    { name: 'Maki Acevichado', count: 5, topCategories: [{ id: 'Sushi / Nikkei / japonesa', count: 5 }], shareWithinDishPool: 5 / 9 },
    { name: 'Croissant de Jamón y Queso', count: 3, topCategories: [{ id: 'Sándwich / panadería salada', count: 3 }], shareWithinDishPool: 3 / 9 },
  ],
  excluded: { categories: [{ id: 'Bebida', count: 6, reason: 'purchase-noise' }], supportedBelowFloor: 0 },
  monthsSeries: { '2022-01': 5, '2022-02': 3 },
  confidenceProfile: { counts: { Media: 7, Alta: 2 }, dominant: { label: 'Media', share: 7 / 9 } },
  caveats: [{ code: 'frequency_is_behavior', text: 'frequency is behavioral evidence' }],
};

const lexicon = {
  schema: 'flavor-lexicon/v1',
  sourceNote: 'curated taste/texture associations from dated design commentary (NOT behavioral evidence)',
  entries: [
    { category: 'Sushi / Nikkei / japonesa', edge: { kind: 'taste', id: 'umami-rich', weight: 0.6, note: 'soy/dashi/fish proteins' } },
    { category: 'Sushi / Nikkei / japonesa', edge: { kind: 'texture', id: 'tender-chewy', weight: 0.4, note: 'rice/dough' } },
    { category: 'Sándwich / panadería salada', edge: { kind: 'taste', id: 'savoury-rich', weight: 0.5, note: 'cheese/butter pastry' } },
  ],
};

test('happy path: dishes, cuisines, and lexicon taste/texture nodes exist with provenance', () => {
  const g = G.buildGraph(profile, lexicon);
  const kinds = Object.fromEntries(g.nodes.map((n) => [n.id, n.kind]));
  assert.strictEqual(kinds['dish:Maki Acevichado'], 'dish');
  assert.strictEqual(kinds['Sushi / Nikkei / japonesa'], 'cuisine');
  assert.strictEqual(kinds['umami-rich'], 'taste');
  const dishEdges = g.edges.filter((e) => e.relation === 'ordered');
  const makiDishEdge = dishEdges.find((e) => e.from.startsWith('dish:') && e.to === 'Sushi / Nikkei / japonesa');
  assert.ok(makiDishEdge, JSON.stringify(dishEdges));
  assert.strictEqual(makiDishEdge.weight, 5, 'count-derived weight equals actual order count');
  assert.strictEqual(makiDishEdge.basis.kind, 'behavioral-count');
  assert.strictEqual(makiDishEdge.basis.confidence, 'observed');
  const tasteEdges = g.edges.filter((e) => e.relation === 'pairs-with-flavor');
  const umami = tasteEdges.find((e) => e.to === 'umami-rich');
  assert.ok(umami && umami.basis.kind === 'curated-lexicon' && umami.basis.confidence === 'inferred', JSON.stringify(umami));
  assert.ok(/not behavioral evidence/i.test(umami.basis.note), 'lexicon edge carries its non-evidence honesty tag');
});

test('dangling edge (unknown category) is refused, not silently added', () => {
  const bad = { ...lexicon, entries: [{ category: 'Le bananas fries', edge: { kind: 'taste', id: 'sweet', weight: 0.5, note: 'x' } }] };
  assert.throws(() => G.buildGraph(profile, bad), (e) => e.code === 'unknown_category', String(e => e.message));
});

test('unsupported lexicon edge kind refuses (schema enum enforced)', () => {
  const bad = { ...lexicon, entries: [{ category: 'Sushi / Nikkei / japonesa', edge: { kind: 'vibes', id: 'x', weight: 0.5, note: 'x' } }] };
  assert.throws(() => G.buildGraph(profile, bad), (e) => e.code === 'bad_edge_kind');
});

test('weight clamp: lexicon weights outside [0,1] refuse (no silent normalization)', () => {
  const bad = { ...lexicon, entries: [{ category: 'Sushi / Nikkei / japonesa', edge: { kind: 'taste', id: 'umami-rich', weight: 900, note: 'x' } }] };
  assert.throws(() => G.buildGraph(profile, bad), (e) => e.code === 'weight_out_of_range');
});

test('noise categories never become cuisine nodes even with lexicon entries', () => {
  const bad = { ...lexicon, entries: [...lexicon.entries, { category: 'Bebida', edge: { kind: 'taste', id: 'sweet', weight: 0.3, note: 'x' } }] };
  const g = G.buildGraph(profile, bad);
  assert.strictEqual(g.nodes.find((n) => n.id === 'Bebida'), undefined, JSON.stringify(g.nodes.map(n => n.id)));
});

test('every node/edge carries provenance metadata (kind, weights, basis) and exported deterministically', () => {
  const a = JSON.stringify(G.buildGraph(profile, lexicon));
  const b = JSON.stringify(G.buildGraph(profile, lexicon));
  assert.strictEqual(a, b, 'pure function output is deterministic');
  const g = JSON.parse(a);
  for (const e of g.edges) assert.ok(e.basis && e.basis.kind && e.basis.confidence, JSON.stringify(e));
  for (const n of g.nodes) assert.ok(['dish', 'cuisine', 'taste', 'texture', 'technique'].includes(n.kind));
});
