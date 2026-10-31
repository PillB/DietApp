/*
 * P5.1 — flavor engine (PURE). Consumes the aggregate-only atlas produced by
 * scripts/flavor_extract.py (PRIVATE input, aggregates out; engine never sees
 * row data). Rules from the roadmap + handover:
 *   - purchase-noise split: grocery/pantry + beverages are excluded from TASTE
 *     ranking with an explicit reason (they are purchase categories, not dishes);
 *   - support floor: engine default minSupport comes from the atlas (min_support),
 *     overridable upward — nothing below floor is surfaced;
 *   - HTML-entity normalization of names (&amp; etc.) for data quality;
 *   - confidence distribution surfaced as caveats (Media-dominance named);
 *   - atlas policy caveat propagates (aggregate-only, not publishable).
 * Global user rule: CC ceiling 12 per function.
 * Browser (window.FlavorCore) + Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FlavorCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const NOISE_CATEGORIES = [
    { match: /supermercado/i, reason: 'purchase-noise (grocery/pantry items are purchases, not dish tastes)' },
    { match: /^bebida/i, reason: 'purchase-noise (beverages are drink purchases, not dish tastes)' },
    { match: /bebida alcoh/i, reason: 'purchase-noise (alcohol purchases are adult-beverage buys, not dish tastes)' },
    { match: /otro alimento/i, reason: 'purchase-noise (uncategorized purchases; not scored)' },
  ];

  function isNoiseCategory(id) {
    return NOISE_CATEGORIES.find((n) => n.match.test(id)) || null;
  }

  function decodeBasicEntities(s) {
    return String(s)
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  function rankedItems(atlas, floor, dishPool, excluded) {
    const out = [];
    for (const [name, count] of Object.entries(atlas.supported_item_counts)) {
      if (count < floor) { excluded.supportedBelowFloor += count; continue; }
      const cats = atlas.supported_item_categories && atlas.supported_item_categories[name];
      if (isNoiseCategory(Object.keys(cats || {})[0])) continue; // grocery/drinks never surface as taste
      out.push({
        name: decodeBasicEntities(name),
        count,
        topCategories: cats ? Object.entries(cats).map(([id, n]) => ({ id, count: n })) : [],
        shareWithinDishPool: dishPool > 0 ? count / dishPool : 0,
      });
    }
    return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function confidenceProfileOf(atlas) {
    const conf = atlas.description_confidence_counts || {};
    const total = Object.values(conf).reduce((s, n) => s + n, 0) || 1;
    const top = Object.entries(conf).sort((a, b) => b[1] - a[1])[0] || ['unknown', 0];
    return { counts: conf, dominant: { label: top[0], share: top[1] / total } };
  }

  function buildTasteProfile(atlas, { minSupport }) {
    if (!atlas || atlas.schema !== 'flavor-atlas/v1') {
      throw new Error(`flavor atlas schema must be flavor-atlas/v1 (got ${atlas && atlas.schema})`);
    }
    const floor = minSupport != null ? minSupport : atlas.min_support;
    const excluded = { categories: collectNoiseCategories(atlas), supportedBelowFloor: 0 };
    const dishPool = atlas.items - countRows(excluded.categories) - atlas.suppressed_item_total;
    const items = rankedItems(atlas, floor, dishPool, excluded);
    return {
      schema: atlas.schema,
      generatedAt: atlas.generated_at,
      dishPool,
      items,
      excluded,
      monthsSeries: atlas.month_counts,
      confidenceProfile: confidenceProfileOf(atlas),
      caveats: [
        { code: 'aggregate_only', text: 'Built from an AGGREGATE-ONLY derivative of the private workbook; no identifiers or rows ship.' },
        { code: 'frequency_is_behavior', text: 'Frequency is BEHAVIORAL evidence, not a clinical preference measurement; proper assertions need reviewer confirmation.' },
        { code: 'description_confidence', text: `Item descriptions are largely machine-inferred (dominant label: ${confidenceProfileOf(atlas).dominant.label}, ${(100 * confidenceProfileOf(atlas).dominant.share).toFixed(0)}% of rows) — treat item-level claims cautiously.` },
      ],
    };
  }

  function collectNoiseCategories(atlas) {
    const out = [];
    for (const [id, count] of Object.entries(atlas.category_counts)) {
      const noise = isNoiseCategory(id);
      if (noise) out.push({ id, count, reason: noise.reason });
    }
    return out;
  }

  function countRows(categories) {
    return categories.reduce((s, c) => s + c.count, 0);
  }

  return { buildTasteProfile, decodeBasicEntities, isNoiseCategory, NOISE_CATEGORIES };
});
