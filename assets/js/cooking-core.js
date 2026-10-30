/*
 * P4.1/P4.3 — cook-mode core (PURE). Safety numbers are public-authoritative,
 * cited constants — never invented and never derived:
 *   SOURCE: FoodSafety.gov "Safe Minimum Internal Temperature Chart"
 *   (poultry 74°C incl. ground poultry; ground meat 71°C; whole cuts beef/pork/
 *   lamb 63°C + rest; fish 63°C; leftovers/all reheated food 74°C)
 *   LEFTOVERS: USDA FSIS — cooked food 3-4 days refrigerated ≤4°C (40°F),
 *   refrigerate within 2 h, reheat to 74°C. 0-2 days is the "within window"
 *   comfortable band; 4-5 days is BEYOND the published guideline.
 * The Instant Pot gate (P4.2) is structural: pressure times require
 * (a) pressure equipment on the recipe, (b) a validation provenance record of
 * type kitchen_experiment or public_doc — NEVER generated_report, NEVER an
 * inference from stovetop minutes.
 * Browser (window.CookingCore) + Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CookingCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SOURCE = 'FoodSafety.gov Safe Minimum Internal Temperature Chart';
  const MIN_TEMP_C = {
    poultry: 74,
    ground_meat: 71,
    fish: 63,
    whole_cut_beef_pork_lamb: 63,
    leftovers_reheat: 74,
  };
  /** No code constant: the 3-min rest requirement for whole cuts lives in validateStepGate. */
  function getMinTempC(foodType) {
    return Object.prototype.hasOwnProperty.call(MIN_TEMP_C, foodType) ? MIN_TEMP_C[foodType] : null;
  }

  function err(errors, path, code, message) {
    errors.push({ path, code, message: message || code });
  }

  /** Step safety gate: authoritative floor + thermometer requirement. */
  function validateStepGate(step) {
    const errors = [];
    const foodType = step.foodType;
    if (!foodType) {
      err(errors, 'foodType', 'food_type_required', 'heat-critical steps must declare their food class for the authoritative floor');
      return { ok: false, errors };
    }
    const floor = getMinTempC(foodType);
    if (floor === null) {
      err(errors, 'foodType', 'unknown_food_type', `declare one of ${Object.keys(MIN_TEMP_C).join(',')} or defer this step to non-heat-critical`);
      return { ok: false, errors };
    }
    if (step.targetTempC == null) {
      err(errors, 'targetTempC', 'target_temp_missing_for_heat_critical');
    } else if (!(Number.isFinite(step.targetTempC) && step.targetTempC >= floor)) {
      err(errors, 'targetTempC', 'temp_below_authoritative_min', `${foodType} requires ≥ ${floor}°C per ${SOURCE}`);
    }
    if (step.checkpoint !== 'thermometer') {
      err(errors, 'checkpoint', 'thermometer_required', 'protein safety checkpoints must be thermometer-based, not color/time-based');
    }
    if (foodType === 'whole_cut_beef_pork_lamb' && step.targetRestMin == null) {
      err(errors, 'targetRestMin', 'rest_time_required', 'whole cuts need the 3-minute rest component of the standard');
    }
    return { ok: errors.length === 0, errors };
  }

  /** USDA leftovers: descriptive guidance only — no medical guarantee. */
  function leftoverAdvice({ cookedOnIso, nowIso }) {
    const cook = parseLocalDate(cookedOnIso);
    const now = parseLocalDate(nowIso);
    if (cook === null || now === null || now < cook) {
      return {
        status: 'invalid_dates',
        text: 'Dates are invalid or the "now" precedes cooking; check the data instead of trusting this advice.',
      };
    }
    const days = Math.round((now - cook) / 86400000);
    if (days > 4) {
      return {
        status: 'beyond-usda-guideline-window',
        daysPastCooked: days,
        text: `${days} days past cooking is beyond the USDA 3-4 days refrigerated (≤4°C) guideline: do not serve; discard unless a tracked cold-chain record exists below the guideline.`,
      };
    }
    return {
      status: 'within-usda-window',
      daysPastCooked: days,
      text: `Within the USDA 3-4 days refrigerated (≤4°C) guideline (aged ${days} day(s)): store ≤4°C, refrigerate within 2 h of cooking, and reheat to 74°C thoroughly before serving.`,
    };
  }

  function parseLocalDate(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))) return null;
    const [y, m, d] = String(v).split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  }

  /** P4.2 structural gate — pressure time can be validated ONLY by listed equipment + listed provenance. */
  function pressureGate(pressesRecipe, validationRecord) {
    const times = pressesRecipe.times || {};
    const blockers = [];
    const hasPressure = (pressesRecipe.equipment || []).some((e) => /pressure|instant/i.test(String(e)));
    if (times.pressureMin != null && !hasPressure) blockers.push('pressure_without_equipment');
    const VALID_SOURCES = new Set(['kitchen_experiment', 'public_doc']);
    const valid = Boolean(validationRecord
      && validationRecord.sourceEvidenceId
      && VALID_SOURCES.has(validationRecord.sourceType)
      && validationRecord.pressureHasMinLiquid != null
      && validationRecord.fillLineChecked != null
      && validationRecord.releaseModelSpecified != null);
    if (times.pressureMin != null && !valid) {
      blockers.push('pressure_time_not_validated');
    }
    return {
      pressureValidated: Boolean(hasPressure && valid),
      blockers,
      minTempSource: SOURCE,
    };
  }

  /** P4.3 dual-review requirement map for publication gates. */
  function reviewGateForPublication(recipe) {
    const required = [
      { reviewer: 'food-scientist', fields: ['quantities', 'cookingOutcomeEvidence'] },
      { reviewer: 'food-safety', fields: ['temperatures', 'chillingStorage', 'allergens', 'pressureSafety', 'ingredientSuitability'] },
    ];
    const missing = [];
    for (const req of required) {
      const rec = recipe.reviews && recipe.reviews[req.reviewer];
      for (const field of req.fields) {
        if (!rec || !Array.isArray(rec.evidenceIds) || !rec.evidenceIds.includes(field)) {
          missing.push({ reviewer: req.reviewer, field });
        }
      }
      if (!rec || rec.approved !== true) missing.push({ reviewer: req.reviewer, field: 'approval' });
    }
    return { readyForPublication: missing.length === 0, missing };
  }

  return {
    SOURCE, MIN_TEMP_C, getMinTempC,
    validateStepGate, leftoverAdvice, pressureGate, reviewGateForPublication,
  };
});
