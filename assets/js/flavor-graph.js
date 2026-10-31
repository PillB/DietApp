/*
 * P5.2 — semantic flavor graph (PURE).
 * Node kinds: dish, cuisine, taste, texture, technique. Edges:
 *   dish -(ordered)-> cuisine    weight = REAL order count (behavioral-count,
 *                                confidence 'observed') from the atlas pairs;
 *   cuisine -(pairs-with-flavor)-> taste|texture|technique nodes — these are
 *                                CURATED-LEXICON edges: confidence 'inferred',
 *                                expressly tagged as NOT behavioral evidence,
 *                                with a note field (why) and uncertainty.
 * Refusals (fail-closed): unknown lexicon category, unsupported edge kind,
 * weight outside [0,1], malformed basis. Noise categories can never become
 * cuisine nodes. Deterministic pure output (sort-stable).
 * Global user rule: CC ceiling 12 per function.
 * Browser (window.FlavorGraph) + Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FlavorGraph = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const NODE_KINDS = ['dish', 'cuisine', 'taste', 'texture', 'technique'];
  const EDGE_KINDS = ['taste', 'texture', 'technique'];
  const EDGE_RELATIONS = { behavioral: 'ordered', lexicon: 'pairs-with-flavor' };

  function fail(code, message) {
    throw Object.assign(new Error(message || code), { code });
  }

  function buildGraph(profile, lexicon) {
    if (!profile || !Array.isArray(profile.items)) fail('bad_profile');
    if (!lexicon || lexicon.schema !== 'flavor-lexicon/v1') fail('bad_lexicon_schema', 'lexicon must be flavor-lexicon/v1');
    const noiseIds = new Set((profile.excluded.categories || []).map((c) => c.id));
    const nodes = [];
    const edges = [];
    for (const item of profile.items) {
      nodes.push(node(`dish:${item.name}`, 'dish', item.name, item.count));
      for (const cat of item.topCategories) {
        if (noiseIds.has(cat.id)) continue; // noise categories never become cuisines
        edges.push(behavioralEdge(`dish:${item.name}`, cat.id, cat.count));
        pushCuisineNode(nodes, cat.id, cat.count);
      }
    }
    applyLexicon(nodes, edges, noiseIds, lexicon);
    nodes.sort((a, b) => `${a.kind}|${a.id}`.localeCompare(`${b.kind}|${b.id}`));
    edges.sort((a, b) => `${a.from}|${a.to}`.localeCompare(`${b.from}|${b.to}`));
    return { meta: { nodeCount: nodes.length, edgeCount: edges.length, generatedFrom: profile.caveats || [] }, nodes, edges };
  }

  function node(id, kind, label, weight) {
    return { id, kind, label, weight: weight == null ? null : weight };
  }

  function pushCuisineNode(nodes, id, count) {
    if (!nodes.some((n) => n.id === id)) nodes.push(node(id, 'cuisine', id, count));
  }

  function behavioralEdge(dishId, cuisineId, count) {
    return {
      from: dishId, to: cuisineId, relation: EDGE_RELATIONS.behavioral, weight: count,
      basis: { kind: 'behavioral-count', confidence: 'observed', note: 'atlas item-category pair count (frequency is behavioral evidence, NOT clinical preference)' },
    };
  }

  function applyLexicon(nodes, edges, noiseIds, lexicon) {
    for (const entry of lexicon.entries) {
      const catId = entry.category;
      if (noiseIds.has(catId)) continue; // noise categories skip lexicon edges silently
      const cuisine = nodes.find((n) => n.id === catId && n.kind === 'cuisine');
      if (!cuisine) fail('unknown_category', `lexicon references unknown/never-cuisine ${catId}`);
      const { kind, id: targetId, weight, note } = entry.edge || {};
      if (!EDGE_KINDS.includes(kind)) fail('bad_edge_kind', `edge kind ${kind} unsupported`);
      if (!(Number.isFinite(weight) && weight >= 0 && weight <= 1)) fail('weight_out_of_range', 'lexicon weights must be in [0,1]');
      if (!nodes.some((n) => n.id === targetId)) nodes.push(node(targetId, kind, targetId, null));
      edges.push({
        from: catId, to: targetId, relation: EDGE_RELATIONS.lexicon, weight,
        basis: { kind: 'curated-lexicon', confidence: 'inferred', note: `${note} — curated association, ${lexicon.sourceNote}` },
      });
    }
  }

  return { buildGraph, NODE_KINDS, EDGE_KINDS, EDGE_RELATIONS };
});
