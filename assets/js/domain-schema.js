/*
 * Domain schema v0.1 (P1.1) — canonical validators per docs/DATA_CONTRACT.md.
 * Pure, dependency-free; browser (window.DomainSchema) and Node (module.exports).
 * Rules encoded at the schema level (never invented later in UI code):
 *  - quantities are exact strings ('1/2', '2 1/2', '300') — parseFloat is banned;
 *  - localDate is a REAL calendar date string, not just format-valid;
 *  - no availability/stock claim can exist without provenance fields
 *    (observation timestamp, sku or URL, locale);
 *  - pressure times may only be recorded with pressure equipment present;
 *  - ids follow contract examples (r1, match-1, order-c32): lowercase slug,
 *    underscores AND hyphens allowed.
 * Each validator returns { ok, errors: [{ path, code, message }] } collecting
 * ALL errors (actionable reporting for P1.4), never just the first.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DomainSchema = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DIMENSION_UNITS = { count: ['count'], g: ['g', 'kg'], ml: ['ml', 'l'] };
  const ALL_UNITS = DIMENSION_UNITS.count.concat(DIMENSION_UNITS.g, DIMENSION_UNITS.ml);
  const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
  const BASIS = ['raw', 'dry', 'cooked'];
  const RETAILERS = ['Wong', 'Plaza Vea', 'Metro', 'Mercado', 'Puntomercado'];
  const AVAILABILITY = ['notChecked', 'unverified', 'listedWithoutLocation', 'listedForLocation', 'outOfStockAtTime', 'unavailable', 'unknown', 'confirmedAtCheckout', 'observed', 'verified'];
  // states that constitute an actual observation/claim and therefore REQUIRE exact provenance
  const CLAIMING_AVAILABILITY = ['listedForLocation', 'outOfStockAtTime', 'unavailable', 'confirmedAtCheckout', 'observed', 'verified'];
  const CONFIDENCE = ['unverified', 'inferred', 'observed', 'verified'];
  const SOURCE_TYPES = ['private_xlsx', 'private_pdf', 'generated_report', 'curated_extract', 'public_doc', 'user_input', 'kitchen_experiment'];
  const VALIDATION_STATUS = ['unverified', 'reviewPending', 'reviewed'];
  // exact nonnegative rational/decimal strings; no sign, no scientific form, no parseFloat
  const QUANTITY_RE = /^\d+(?: \d+\/\d+)?$|^\d+\/\d+$|^\d+(?:\.\d+)?$/;
  const ID_RE = /^[a-z][a-z0-9_-]*$/;
  const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$|^\d{4}-\d{2}-\d{2}$/;

  function makeValidator(type, ruleFns) {
    return function validate(x) {
      if (!x || typeof x !== 'object') {
        return { ok: false, errors: [{ path: type, code: 'not_an_object', message: `${type}: expected an object` }] };
      }
      const errors = [];
      const err = (path, code, message) => { if (code !== undefined) errors.push({ path, code, message: message || code }); };
      for (const rule of ruleFns) rule(x, err);
      return { ok: errors.length === 0, errors };
    };
  }

  function ingredientNameRule(x, err) {
    const hasEsBo = typeof x.name === 'object' && Boolean(x.name && x.name['es-PE']);
    err('name', x.name && typeof x.name === 'object' && x.name.en ? undefined : 'name_missing_en');
    err('name', hasEsBo ? undefined : (x.nameProvisional === true ? undefined : 'english_only_name'), 'es-PE missing: allowed only while nameProvisional is true');
    err('nameProvisional', x.nameProvisional === undefined || typeof x.nameProvisional === 'boolean' ? undefined : 'bad_nameProvisional');
    err('nameProvisional', (!hasEsBo && x.nameProvisional !== true) ? 'needs_nameProvisional' : undefined, 'mark nameProvisional:true until a reviewed es-PE name exists');
    err('nameProvisional', (hasEsBo && x.nameProvisional === true) ? 'needs_nameProvisional' : undefined, 'remove nameProvisional once es-PE is reviewed');
  }

  function isIngredient(x, err) {
    err('id', ID_RE.test(x.id) ? undefined : 'bad_id', 'lowercase slug; contract examples allow r1, match-1, cebolla-roja style ids');
    ingredientNameRule(x, err);
    err('dimension', DIMENSION_UNITS[x.dimension] ? undefined : 'unknown_dimension', `dimension must be one of ${Object.keys(DIMENSION_UNITS).join(',')}`);
    err('purchaseUnit', DIMENSION_UNITS[x.dimension] && DIMENSION_UNITS[x.dimension].includes(x.purchaseUnit) ? undefined : 'purchase_unit_wrong_dimension');
    err('aliases', Array.isArray(x.aliases) && x.aliases.every((a) => typeof a === 'string') ? undefined : 'bad_aliases');
    err('allergenCodes', Array.isArray(x.allergenCodes) ? undefined : 'bad_allergenCodes');
  }

  function recipeHeaderRule(x, err) {
    err('id', ID_RE.test(x.id) ? undefined : 'bad_id');
    err('version', Number.isSafeInteger(x.version) && x.version >= 1 ? undefined : 'bad_version');
    err('recipeKind', ['meal', 'snack', 'staple'].includes(x.recipeKind) ? undefined : 'unknown_recipeKind');
    err('validationStatus', VALIDATION_STATUS.includes(x.validationStatus) ? undefined : 'unknown_validationStatus');
    err('baseServings', Number.isSafeInteger(x.baseServings) && x.baseServings >= 1 ? undefined : 'bad_base_servings');
    err('yieldCookedG', x.yieldCookedG === null || (Number.isFinite(x.yieldCookedG) && x.yieldCookedG >= 0) ? undefined : 'bad_yieldCookedG');
    err('equipment', Array.isArray(x.equipment) ? undefined : 'bad_equipment');
    err('flavorTags', Array.isArray(x.flavorTags) ? undefined : 'bad_flavorTags');
    err('nutrition', x.nutrition && ['not-assessed', 'draft', 'assessed'].includes(x.nutrition.status) ? undefined : 'bad_nutrition');
  }

  function ingredientUseRule(x, err) {
    if (!Array.isArray(x.ingredients)) return err('ingredients', 'ingredients_not_a_list');
    x.ingredients.forEach((u, i) => {
      const p = `ingredients[${i}]`;
      if (!u || typeof u !== 'object') return err(p, 'bad_use');
      if (!ID_RE.test(String(u.ingredientId))) err(`${p}.ingredientId`, 'missing_ingredient_id');
      if (!(typeof u.quantity === 'string' && QUANTITY_RE.test(u.quantity))) err(`${p}.quantity`, 'bad_quantity', 'exact nonnegative string like 1/2, 2 1/2, 300 — parseFloat is banned');
      if (!ALL_UNITS.includes(u.unit)) err(`${p}.unit`, 'unit_wrong_dimension', `unit must be one of ${ALL_UNITS.join(',')}`);
      if (!BASIS.includes(u.basis)) err(`${p}.basis`, 'unknown_basis');
      if (u.unit === 'count' && u.basis !== 'raw') err(`${p}.basis`, 'bad_basis', 'count takes basis raw');
      if ((DIMENSION_UNITS.ml.includes(u.unit) || u.unit === 'count') && u.basis === 'dry') err(`${p}.basis`, 'bad_basis', 'dry is meaningless for ml/count');
      if (typeof u.optional !== 'boolean') err(`${p}.optional`, 'bad_optional');
    });
  }

  function pressureRule(x, err) {
    const t = x.times || {};
    const hasPressure = Array.isArray(x.equipment) && x.equipment.some((e) => /pressure|instant/i.test(String(e)));
    if ((t.pressureMin != null || t.releaseMin != null) && !hasPressure) {
      err('times.pressureMin', 'pressure_without_equipment', 'pressure times require pressure equipment (P4.2: never infer pressure steps)');
    }
  }

  function stepsRule(x, err) {
    if (!Array.isArray(x.steps)) return err('steps', 'steps_not_a_list');
    let prev = 0;
    for (let i = 0; i < x.steps.length; i++) {
      const s = x.steps[i];
      if (!s || typeof s !== 'object') return err(`steps[${i}]`, 'bad_step');
      if (!Number.isSafeInteger(s.order) || s.order <= prev) return err(`steps[${i}].order`, 'steps_not_ascending');
      prev = s.order;
      if (s.targetTempC != null && !(Number.isFinite(s.targetTempC) && s.targetTempC >= 0 && s.targetTempC <= 350)) {
        err(`steps[${i}].targetTempC`, 'bad_target_temp', 'null or within 0..350');
      }
    }
  }

  function isPlanEntry(x, err) {
    err('id', ID_RE.test(x.id) ? undefined : 'bad_id');
    err('localDate', realCalendarDate(x.localDate) ? undefined : 'invalid_local_date', 'must be a real YYYY-MM-DD local date (no UTC math)');
    err('slot', SLOTS.includes(x.slot) ? undefined : 'unknown_slot', `slot must be one of ${SLOTS.join(',')}`);
    err('recipeId', ID_RE.test(x.recipeId) ? undefined : 'bad_recipe_id');
    err('version', Number.isSafeInteger(x.version) && x.version >= 1 ? undefined : 'bad_version');
    err('portions', Number.isSafeInteger(x.portions) && x.portions >= 1 ? undefined : 'bad_portions', 'whole number >= 1 per scheduled occurrence');
    err('repeatRuleId', x.repeatRuleId === null || ID_RE.test(x.repeatRuleId) ? undefined : 'bad_repeatRuleId');
    err('pantryOverride', x.pantryOverride === null || typeof x.pantryOverride === 'object' ? undefined : 'bad_pantryOverride');
  }

  function storePackageRule(x, err) {
    err('packageQty', Number.isFinite(x.packageQty) && x.packageQty > 0 ? undefined : 'bad_packageQty');
    err('packageUnit', ALL_UNITS.includes(x.packageUnit) ? undefined : 'bad_packageUnit');
    err('pricePEN', x.pricePEN === null || (Number.isFinite(x.pricePEN) && x.pricePEN >= 0) ? undefined : 'bad_price');
  }

  function storeListingRule(x, err) {
    err('retailer', RETAILERS.includes(x.retailer) ? undefined : 'unknown_retailer', `retailer must be one of ${RETAILERS.join(',')}`);
    err('listingTitle', x.listingTitle === null || typeof x.listingTitle === 'string' ? undefined : 'bad_listingTitle');
    err('productUrl', x.productUrl === null || (typeof x.productUrl === 'string' && /^https?:\/\//.test(x.productUrl)) ? undefined : 'bad_productUrl');
    err('sku', x.sku === null || typeof x.sku === 'string' ? undefined : 'bad_sku');
    err('matchConfidence', CONFIDENCE.includes(x.matchConfidence) ? undefined : 'unknown_matchConfidence');
    err('notes', Array.isArray(x.notes) ? undefined : 'bad_notes');
  }

  /** 0 provenance-free "in stock" claims: observed/verified require evidence fields. */
    function storeProvenanceRule(x, err) {
    err('availability', AVAILABILITY.includes(x.availability) ? undefined : 'unknown_availability');
    const claims = x.availability === 'observed' || x.availability === 'verified';
    if (!claims) {
      err('locale', x.locale === null || typeof x.locale === 'string' ? undefined : 'bad_locale');
      return;
    }
    const EXACT_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
    err('observationTime', EXACT_TIME_RE.test(x.observationTime) ? undefined : 'claim_missing_observation_time', 'stock claims require an exact observation timestamp (date-only is not provenance)');
    err('sku', (x.sku || x.productUrl) ? undefined : 'claim_missing_sku_or_url');
    err('locale', typeof x.locale === 'string' && x.locale.length > 0 ? undefined : 'claim_missing_locale');
  }

  function isEvidence(x, err) {
    err('id', ID_RE.test(x.id) ? undefined : 'bad_id');
    err('sourceType', SOURCE_TYPES.includes(x.sourceType) ? undefined : 'unknown_source_type');
    err('ref', typeof x.ref === 'string' && x.ref.length > 0 ? undefined : 'bad_ref');
    err('recordedAt', TIMESTAMP_RE.test(x.recordedAt) ? undefined : 'bad_timestamp', 'RFC 3339-ish timestamp or YYYY-MM-DD');
  }

  /** Store catalog product (v0.3, RETAIL_MATCHING.md). Structure-only rows are
   * valid; any claimed state or price must carry full provenance quadruple. */
  function productHeaderRule(x, err) {
    err('id', ID_RE.test(x.id) ? undefined : 'bad_id');
    err('retailer', RETAILERS.includes(x.retailer) ? undefined : 'unknown_retailer');
    err('ingredientId', ID_RE.test(x.ingredientId) ? undefined : 'bad_ingredientId', 'catalog rows must bind to a canonical ingredient id');
    err('notes', Array.isArray(x.notes) ? undefined : 'bad_notes');
    err('locale', x.locale === null || (typeof x.locale === 'string' && x.locale.length > 0) ? undefined : 'bad_locale');
    productMediaRule(x, err);
  }

  function productMediaRule(x, err) {
    err('listingTitle', x.listingTitle === null || (typeof x.listingTitle === 'string' && x.listingTitle.length > 0) ? undefined : 'bad_listingTitle', 'titles must be copied verbatim or stay null — never generated');
    err('sku', x.sku === null || typeof x.sku === 'string' ? undefined : 'bad_sku');
    err('productUrl', x.productUrl === null || (typeof x.productUrl === 'string' && /^https?:\/\//.test(x.productUrl)) ? undefined : 'bad_productUrl');
  }

  function productPackRule(x, err) {
    err('packageQty', x.packageQty === null || (Number.isFinite(x.packageQty) && x.packageQty > 0) ? undefined : 'bad_packageQty');
    err('packageUnit', x.packageUnit === null || ALL_UNITS.includes(x.packageUnit) ? undefined : 'bad_packageUnit');
    err('pricePEN', x.pricePEN === null || (Number.isFinite(x.pricePEN) && x.pricePEN >= 0) ? undefined : 'bad_price');
    const pack = x.hypothesisPack;
    if (pack == null) return;
    const okQ = (typeof pack.quantity === 'string' && QUANTITY_RE.test(pack.quantity)) || (Number.isFinite(pack.quantity) && pack.quantity >= 0);
    err('hypothesisPack', okQ && ALL_UNITS.includes(pack.unit) ? undefined : 'bad_hypothesisPack', 'a HYPOTHESIS pack is a non-provenance aid, never used for purchase math');
  }

  function productProvenanceRule(x, err) {
    err('availability', AVAILABILITY.includes(x.availability) ? undefined : 'unknown_availability', `availability must be one of ${AVAILABILITY.join(',')}`);
    if (CLAIMING_AVAILABILITY.includes(x.availability)) {
      claimProvenanceRule(x, err);
      if (['listedForLocation', 'confirmedAtCheckout'].includes(x.availability)) {
        err('listingTitle', typeof x.listingTitle === 'string' && x.listingTitle.length > 0 ? undefined : 'claim_missing_listing_title', 'verified listing states require the verbatim retail title');
        err('productUrl', Boolean(x.productUrl) ? undefined : 'claim_missing_product_url');
      }
    }
    if (x.pricePEN != null) {
      claimProvenanceRule(x, err, 'price');
    }
  }

  /** Exact observation timestamp + locale quadruple prefix shared by claims & prices. */
  function claimProvenanceRule(x, err, prefix = 'claim') {
    const EXACT_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
    err('observationTime', EXACT_TIME_RE.test(x.observationTime) ? undefined : `${prefix}_missing_observation_time`, 'a claim/price without exact observation time is not provenance');
    err('locale', typeof x.locale === 'string' && x.locale.length > 0 ? undefined : `${prefix}_missing_locale`, 'store + district context required');
    if (prefix === 'price') err('productUrl', Boolean(x.productUrl) || x.sku ? undefined : 'price_missing_sku_or_url');
  }

  function realCalendarDate(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const [y, m, d] = String(v).split('-').map(Number);
    if (m < 1 || m > 12 || d < 1) return false;
    const date = new Date(y, m - 1, d, 12, 0, 0, 0);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }

  return {
    SCHEMA_VERSION: 'domain-schema/v0.3',
    QUANTITY_RE,
    validateIngredient: makeValidator('Ingredient', [isIngredient]),
    validateRecipeVersion: makeValidator('RecipeVersion', [recipeHeaderRule, ingredientUseRule, pressureRule, stepsRule]),
    validatePlanEntry: makeValidator('PlanEntry', [isPlanEntry]),
    validateStoreMatch: makeValidator('StoreMatch', [storeListingRule, storePackageRule, storeProvenanceRule]),
    validateStoreProduct: makeValidator('StoreProduct', [productHeaderRule, productPackRule, productProvenanceRule]),
    CLAIMING_AVAILABILITY,
    validateEvidence: makeValidator('Evidence', [isEvidence]),
  };
});
