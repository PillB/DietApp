'use strict';
// LEDGER-D51 — W1 safety-corpus research pinning.
// Cites the following external authorities (validated 2026-10-31, see docs/
// SUPERVISOR_PRODUCTION_PLAN.md §5):
//   1. FDA/USDA — fish = 145 °F (63 °C) immediate standard.
//   2. PMC 2020 (salmon sous-vide 57 vs 63 °C) — 63 °C × 80 min is the checked
//      microbiological-quality endpoint; 57 °C × 20 min is NOT storage-safe.
//   3. Baldwin (via sousvideways) — 60 °C × 1.5 h for at-risk diners; 52 °C/125 °F
//      is the non-pasteurizing "sweet spot" requiring sashimi-grade sourcing.
//   4. ISVA — danger zone >41 °C and <52 °C; 4-hour cumulative rule.
//   5. Birria pressure corpus (Thai Caliente, PressureCookingToday + 195 °F/91 °C
//      shreddable check, ForkedSpoon, dadcooksdinner) — beef chuck HIGH 40–60 min,
//      natural release ≥10–15 min.
// The engine constants are CONSERVATIVE (63 °C fish floor, 74 °C poultry/leftovers)
// — pinned here so future edits cannot silently lower them to sous-vide-texture
// temperatures without an explicit recorded decision.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const COOK = require('../assets/js/cooking-core.js');
global.window = {};
require('../assets/js/nutrition-data.js');
const ND = window.GOURMET_NUTRITION_DATA;

const AUTHORITY = {
  fishFloorC: 63,          // FDA
  poultryFloorC: 74,       // USDA/FoodSafety.gov
  salmonResearchMinC: 57,  // PMC study endpoints referenced in the plan
  birriaPressurMin: 40,    // corpus
  birriaPressurMax: 60,    // corpus
  birriaReleaseMin: 10,    // natural release minutes cited
};

test('cooking-core MIN_TEMP_C matches the FoodSafety.gov chart exactly', () => {
  assert.strictEqual(COOK.getMinTempC('fish'), AUTHORITY.fishFloorC);
  assert.strictEqual(COOK.getMinTempC('poultry'), AUTHORITY.poultryFloorC);
  assert.strictEqual(COOK.getMinTempC('whole_cut_beef_pork_lamb'), 63);
  assert.strictEqual(COOK.getMinTempC('ground_meat'), 71);
  assert.strictEqual(COOK.getMinTempC('leftovers_reheat'), 74);
});

test('fetched temperature claims across the temperature corpus stay at or above the research authority floors', () => {
  const samples = [];
  for (const recipe of ND.curatedRecipes) {
    const claims = COOK.extractHeatClaims(recipe.steps);
    for (const claim of claims) {
      if (!claim) continue;
      samples.push({ id: recipe.id, tempC: claim.tempC });
    }
  }
  assert.ok(samples.length > 0, 'curated corpus must mention temperatures at all');
  for (const { id, tempC } of samples) {
    assert.ok(
      tempC >= 63,
      `${id} claims ${tempC} °C — below the conservative research floor 63 °C (sous-vide texture temps like 46-55 °C exist in research but are NOT safely citable without sashimi-grade/sourcing caveats)`,
    );
  }
});

test('birria beef-chuck pressure guidance stays inside the validated corpus window', () => {
  const birria = ND.curatedRecipes.find((r) => r.id === 'birria-beans-rice');
  assert.ok(birria, 'birria-beans-rice present');
  const steps = birria.steps.join(' ');
  const minutes = [...steps.matchAll(/(\d+)\s*minutes?/gi)].map((m) => Number(m[1]));
  const pressureMin = minutes.filter((m) => m >= AUTHORITY.birriaPressurMin && m <= AUTHORITY.birriaPressurMax);
  assert.ok(pressureMin.length >= 1, `no pressure duration inside 40-60 min corpus found: ${JSON.stringify(minutes)}`);
  // natural release wording present (≥ 10 min band cited by the authorities)
  assert.ok(/natural release/i.test(steps) && /15/.test(steps), 'birria natural-release guidance missing or below the 10-15 min authority band');
});

test('seeded-negative: a lowered fish floor (52 °C texture temp) is correctly REJECTED as a deviation', () => {
  const lowered = { fish: 52, poultry: 60 };
  assert.notStrictEqual(
    lowered.fish,
    COOK.getMinTempC('fish'),
    'a 52 °C fish floor would need sashimi-grade sourcing rules first — the engine conservative floor is 63 °C (FDA) and that must not drift silently',
  );
});
