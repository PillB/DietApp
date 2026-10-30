/*
 * P3.3 — store matching (PURE). Demand FIRST, explicit match states after.
 * docs/RETAIL_MATCHING.md core rules encoded:
 *  - only catalog rows bound to the SAME canonical ingredientId are exact
 *    candidates (aliases never substitute — cebolla roja ≠ cebolla china,
 *    ají fresh ≠ ají paste are distinct rows in the fixture);
 *  - 'available' claims made by anyone require the provenance quadruple
 *    (exact observation time, locale, verbatim title, URL/sku) — enforced in
 *    DomainSchema v0.3, and matchers never upgrade a row's availability;
 *  - hypothesisPack is a visible non-provenance aid: NEVER feeds purchase math;
 *  - a row without any considered packages leaves the shopping line's
 *    needsPackageDecision untouched.
 * Fixture catalog ships structure only: titles, prices, SKUs, URLs, timestamps
 * all null; availability 'notChecked'; hypothesisPack marked in notes.
 * Browser (window.StoreMatches) + Node (module.exports).
 */
(function (root, factory) {
  const S = typeof require === 'function' ? require('./domain-schema.js') : root.DomainSchema;
  const api = factory(S);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StoreMatches = api;
})(typeof window !== 'undefined' ? window : globalThis, function (S) {
  'use strict';

  const UNIT_FAMILIES = { count: 'count', g: 'mass', kg: 'mass', ml: 'volume', l: 'volume' };
  const familyOf = (u) => UNIT_FAMILIES[u];

  /** Candidate structure for one shopping line. Explicit non-invention details. */
  function matchLine(line, catalog) {
    const result = {
      ingredientId: line.ingredientId,
      unit: line.unit,
      matches: [],
      recommended: null, // ALWAYS null in v0.1: nothing live-verified yet
      warnings: [],
    };
    const catalogProducts = (catalog || []).filter((p) => S.validateStoreProduct(p).ok);
    const invalidRows = (catalog || []).length - catalogProducts.length;
    if (invalidRows > 0) result.warnings.push({ code: 'invalid_catalog_rows_ignored', count: invalidRows });

    for (const p of catalogProducts) {
      if (p.ingredientId !== line.ingredientId) continue; // exact id only — no alias substitution
      if (familyOf(p.packageUnit || (p.hypothesisPack || {}).unit) !== familyOf(line.unit)) continue;
      result.matches.push({
        matchId: p.id,
        retailer: p.retailer,
        availability: p.availability, // copied, NEVER upgraded
        pricePEN: p.pricePEN,
        observationTime: p.observationTime,
        listingTitle: p.listingTitle,
        hypothesisPack: p.hypothesisPack || null,
        notes: (p.notes || []).map((n) => n),
        usableForPurchaseMath: p.packageQty != null && claimableOk(p), // recorded packaging only
      });
    }
    if (result.matches.length === 0) {
      result.warnings.push({ code: 'no_catalog_match_search_link_needed' });
    }
    if (result.matches.length > 0 && result.matches.every((m) => !m.usableForPurchaseMath)) {
      result.warnings.push({ code: 'matches_unverified_availability' });
    }
    return result;
  }

  function claimableOk(p) {
    return S.CLAIMING_AVAILABILITY.includes(p.availability)
      ? Boolean(p.observationTime && p.locale && (p.productUrl || p.sku) && p.listingTitle)
      : p.availability === 'notChecked'; // 'notChecked' rows with recorded packaging are usable but unverified
  }

  /** Packages map for shopping-core consumption, from RECORDED packaging rows
   * only; hypothesisPack is excluded by CONTRACT, not by a(roleta) flag choice. */
  function verifiedPackages(catalog) {
    const packages = {};
    for (const p of catalog || []) {
      if (!S.validateStoreProduct(p).ok) continue;
      if (p.packageQty != null && p.packageUnit != null) {
        // first recorded row wins deterministically (sorted ids)
        if (!packages[p.ingredientId]) packages[p.ingredientId] = { quantity: String(p.packageQty), unit: p.packageUnit };
      }
    }
    return packages;
  }

  return { matchLine, verifiedPackages, familyOf };
});
