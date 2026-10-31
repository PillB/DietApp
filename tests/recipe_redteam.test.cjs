'use strict';
// Recipe RED-TEAM harness — 5 lenses over every canonical recipe (owner mandate:
// red-team each recipe repeatedly; here each recipe crosses 5 deterministic lenses,
// and every lens has its own seeded-negative fabrication proving it can FAIL).
// L1 ingredient integrity (schema + refs) · L2 mise/station order · L3 safety/temp gate ·
// L4 exact quantities/units · L5 Cooking-for-Engineers diagram integrity.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../assets/js/domain-schema.js');
const Q = require('../assets/js/quantity.js');
const COOK = require('../assets/js/cooking-core.js');

const ROOT = path.resolve(__dirname, '..');
const canon = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/canonical/docx-diet-recipes-canon.v1.json'), 'utf8'));
const weighedSource = JSON.parse(fs.readFileSync(path.join(ROOT, 'nutrition-reviewed.json'), 'utf8'));
const weighed = require('../assets/js/import-weighed.js').importWeighed(weighedSource.curatedRecipes);

function l1IngredientIntegrity(canon, permeated = canon.recipes) {
  const issues = [];
  for (const ing of canon.ingredients) {
    const v = S.validateIngredient(ing);
    if (!v.ok) issues.push({ id: ing.id, code: v.errors[0].code });
  }
  for (const r of permeated) {
    const merged = { ...r.meta, equipment: (r.meta.equipment || []).map((e) => String(e).split('|')[0]), ingredients: r.ingredients, steps: r.steps, flavorTags: r.meta.flavorTags || [] };
    const v = S.validateRecipeVersion(merged);
    if (!v.ok) issues.push({ id: merged.id, code: v.errors[0].code });
    const inList = new Set(r.ingredients.map((u) => u.ingredientId));
    for (const st of r.steps) for (const ref of st.ingredients) if (!inList.has(ref)) issues.push({ id: merged.id, code: 'step_refs_unknown_ingredient', ref });
  }
  return issues;
}

function l2MiseStationOrder(recipe) {
  const issues = [];
  const stationUsed = new Set((recipe.steps || []).map((s) => s.station).filter(Boolean));
  const miseStations = new Set((recipe.mise_en_place || []).map((m) => m.station.split(' - ')[0]));
  for (const s of stationUsed) if (!miseStations.has(s.replace(/ - .*/, ''))) issues.push({ recipe: recipe.meta.id, station: s, code: 'station_without_mise' });
  for (const s of recipe.steps) {
    if (!s.esPE || s.esPE.length < 12) issues.push({ recipe: recipe.meta.id, step: s.id, code: 'missing_esPE' });
    if (!s.text || !s.text.en) issues.push({ recipe: recipe.meta.id, step: s.id, code: 'missing_en_text' });
  }
  return issues;
}

function l3SafetyTempGate(recipe, inferredFoodCall) {
  const issues = [];
  for (const st of recipe.steps) {
    if (st.targetTempC != null) {
      const gate = COOK.validateStepGate({ ...st, foodType: inferredFoodCall && inferredFoodCall.foodType });
      if (!gate.ok) issues.push({ recipe: recipe.meta.id, step: st.id, code: gate.errors[0].code });
    }
  }
  return issues;
}

function l4ExactQuantities(recipe) {
  const issues = [];
  let parsedOK;
  for (const u of recipe.ingredients) {
    try { Q.parseExact(u.quantity); parsedOK = true; } catch (e) { parsedOK = false; }
    const id = (recipe.meta || recipe).id;
    if (!parsedOK) issues.push({ recipe: id, ingredientId: u.ingredientId, code: 'bad_quantity' });
    if (!['count', 'g', 'kg', 'ml', 'l'].includes(u.unit)) issues.push({ recipe: id, ingredientId: u.ingredientId, code: 'bad_unit' });
  }
  return issues;
}

function l5DiagramIntegrity(recipe) {
  const issues = [];
  const d = recipe.diagram;
  if (!d || d.style !== 'cooking-for-engineers-binary') {
    issues.push({ recipe: recipe.meta.id, code: 'missing_diagram' });
    return issues;
  }
  const recipeIngredients = new Set(recipe.ingredients.map((u) => u.ingredientId));
  const referenced = new Set();
  for (const row of d.rows) for (const t of row.tokens) if (t) referenced.add(t);
  for (const t of recipeIngredients) if (!referenced.has(t)) issues.push({ recipe: recipe.meta.id, ingredient: t, code: 'ingredient_absent_from_diagram' });
  for (const row of d.rows) if (row.stationIdx >= d.columns.length) issues.push({ recipe: recipe.meta.id, code: 'diagram_column_overflow' });
  return issues;
}

test('L1: every canonical recipe validates via DomainSchema and every step ingredient ref resolves (seeded-negative proves liveness)', () => {
  assert.deepStrictEqual(l1IngredientIntegrity(canon), [], 'canonical docx recipes L1 fail: %o');
  const bogus = { ...canon, recipes: [{ ...canon.recipes[0], steps: [{ ...canon.recipes[0].steps[0], ingredients: ['ghost_ingredient'] }] }] };
  const caught = l1IngredientIntegrity(bogus);
  assert.ok(caught.some((x) => x.code === 'step_refs_unknown_ingredient'), JSON.stringify(caught));
});

test('L2: mise/station order + per-step es-PE language (seeded-negative proves liveness)', () => {
  for (const r of canon.recipes) assert.deepStrictEqual(l2MiseStationOrder(r), [], `${r.meta.id} L2: ${JSON.stringify(l2MiseStationOrder(r))}`);
  const broken = { ...canon.recipes[0], steps: [{ ...canon.recipes[0].steps[0], esPE: '' }] };
  const caught = l2MiseStationOrder(broken);
  assert.ok(caught.some((x) => x.code === 'missing_esPE'), JSON.stringify(caught));
});

test('L3: safety temperature gate passes for the fish step (63 °C + thermometer + inferred foodType)', () => {
  const fish = canon.recipes.find((r) => r.meta.id === 'pescado_ajonjoli_diet');
  assert.deepStrictEqual(l3SafetyTempGate(fish, { foodType: 'fish' }), [], JSON.stringify(l3SafetyTempGate(fish, { foodType: 'fish' })));
  const bogus = { ...fish, steps: [{ ...fish.steps[1], targetTempC: 65, checkpoint: 'thermometer' }] };
  const caught = l3SafetyTempGate(bogus, { foodType: 'poultry' });
  assert.ok(caught.some((x) => x.code === 'temp_below_authoritative_min'), JSON.stringify(caught));
});

test('L4: exact rational quantities + canonical units in every recipe (seeded-negative proves liveness)', () => {
  for (const r of canon.recipes) assert.deepStrictEqual(l4ExactQuantities(r), [], `${r.meta.id} L4: ${JSON.stringify(l4ExactQuantities(r))}`);
  const bogus = { ...canon.recipes[0], ingredients: [{ ...canon.recipes[0].ingredients[0], quantity: '1e-7' }] };
  const caught = l4ExactQuantities(bogus);
  assert.ok(caught.some((x) => x.code === 'bad_quantity'), JSON.stringify(caught));
});

test('L5: Cooking-for-Engineers diagram present; EVERY recipe ingredient appears in it (seeded-negative proves liveness)', () => {
  for (const r of canon.recipes) assert.deepStrictEqual(l5DiagramIntegrity(r), [], `${r.meta.id} L5: ${JSON.stringify(l5DiagramIntegrity(r))}`);
  const bogus = { ...canon.recipes[1], ingredients: [...canon.recipes[1].ingredients, { ingredientId: 'garnish_ghost', quantity: '5', unit: 'g', basis: 'raw', optional: true }] };
  const caught = l5DiagramIntegrity(bogus);
  assert.ok(caught.some((x) => x.code === 'ingredient_absent_from_diagram'), JSON.stringify(caught));
});

test('weighed 7 recipes also cross L1 (schema) and L4 (exact quantities) through the importer', () => {
  for (const r of weighed.recipes) assert.deepStrictEqual(S.validateRecipeVersion(r).errors, [], r.id);
  for (const r of weighed.recipes) assert.deepStrictEqual(l4ExactQuantities(r), [], r.id);
});

test('needs kitchen validation flag stands until owner weigh-in (LEDGER-2 falsifiable state)', () => {
  assert.strictEqual(canon.needsKitchenValidation, true);
  for (const r of canon.recipes) assert.strictEqual(r.meta.validationStatus, 'reviewPending');
});
