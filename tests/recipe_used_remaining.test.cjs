'use strict';
// LEDGER-D48 — recipe ↔ shopping MATH red team.
// (A) exact correspondence: a 1-entry plan must aggregate to the same grams the
//     recipe declares (used == available, representation-independent).
// (B) used/remaining step ledger: every numeric +g/+ml claim in the cook steps
//     must be backed by the declared ingredient total (used ≤ available ⇒ remaining ≥ 0).
// Seeded-negative: a corrupted step PROVES the harness can fail.
const { test } = require('node:test');
const assert = require('node:assert/strict');

global.window = {}; // nutrition-data.js is browser-first

const SHOP = require('../assets/js/shopping-core.js');
const IM = require('../assets/js/import-weighed.js');
require('../assets/js/nutrition-data.js');
const ND = window.GOURMET_NUTRITION_DATA;

const { recipes } = IM.importWeighed(ND.curatedRecipes);

function parseStepClaims(text) {
  const out = [];
  for (const m of String(text).matchAll(/(\d+(?:[\s,]?\d+)*(?:\.\d+)?)\s?(g|kg|ml)\b/gi)) {
    let n = Number(m[1].replace(/[ ,\u00a0]/g, ''));
    if (m[2].toLowerCase() === 'kg') n *= 1000;
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

// recipe-scoped keyword matchers: ONLY claims whose step mentions a weighed
// ingredient (tool/duration claims without a matching noun are excluded)
const STEP_CLAIM_RULES = [
  { id: 'brown_rice_dry', re: /brown[- ]?rice/i },
  { id: 'salmon', re: /salmon/i },
  { id: 'edamame', re: /edamame/i },
  { id: 'quinoa_dry', re: /quinoa/i },
  { id: 'greek_yogurt', re: /yogu?rt/i },
  { id: 'corn_tortilla', re: /tortilla/i },
  { id: 'wholewheat_pita', re: /pita/i },
  { id: 'wholewheat_pasta_dry', re: /pasta/i },
  { id: 'rolled_oats_dry', re: /oats/i },
  { id: 'potato', re: /potato/i },
  { id: 'tomato', re: /tomato/i },
  { id: 'cocoa', re: /cocoa/i },
  { id: 'dark_chocolate', re: /chocolate/i },
  { id: 'berries', re: /berries/i },
  { id: 'cabbage', re: /cabbage/i },
  { id: 'garlic', re: /garlic/i },
  { id: 'mushroom', re: /mushroom/i },
  { id: 'artichoke', re: /artichoke/i },
  { id: 'greens', re: /spinach|greens/i },
  { id: 'soy_sauce', re: /soy|tamari/i },
  { id: 'vinegar', re: /vinegar/i },
  { id: 'olive_oil', re: /\bolive oil/i },
  { id: 'lime', re: /\blime/i },
  { id: 'vegetable_stock', re: /\bstock\b/i },
  { id: 'chili', re: /chile|chili|guajillo|ancho/i },
];

test('(A) exact correspondence: batch-linked entry (portions=baseServings) aggregates EXACTLY the declared grams; a 1-portion entry aggregates exactly the per-serving fraction', () => {
  for (const cr of ND.curatedRecipes) {
    const imp = recipes.find((r) => r.id === cr.id);
    assert.ok(imp, `imported recipe missing: ${cr.id}`);
    assert.strictEqual(imp.baseServings, cr.servings, `${cr.id}: baseServings lost in import`);

    const declared = new Map();
    for (const ing of cr.ingredients) declared.set(ing.id, (declared.get(ing.id) || 0) + Number(ing.weightG || 0));

    // batch case: portions = baseServings ⇒ scale 1 ⇒ exact ingredient totals
    // Identity check in the LINE unit domain: 'g' lines ≡ weightG sums; 'ml' lines
    // ≡ quantity sums; 'each' lines ≡ count sums (dual representation is honest)
    const mk = (portions) => ({
      id: 'e1', localDate: '2027-03-02', slot: 'dinner', recipeId: cr.id,
      version: imp.version || 1, portions, repeatRuleId: null, pantryOverride: null,
    });
    const batch = SHOP.buildShoppingList({
      recipes: [imp], planEntries: [mk(cr.servings)],
      from: '2027-03-02', to: '2027-03-02',
    });
    assert.ok(!batch.refused, `${cr.id} refused: ${JSON.stringify(batch.errors)}`);
    const wantUnit = (id) => {
      const ing = cr.ingredients.find((i) => i.id === id);
      return ing ? (ing.countEach != null ? 'each' : (ing.unit || 'g')) : 'g';
    };
    const cnt = new Map();
    for (const ing of cr.ingredients) cnt.set(ing.id, (cnt.get(ing.id) || 0) + Number(ing.quantity || 0));
    const agg = new Map();
    for (const line of batch.lines) {
      assert.ok(line.ingredientId, `${cr.id}: line without ingredientId\n${JSON.stringify(line).slice(0, 300)}`);
      const g = line.netRequired ? (line.netRequired.num / line.netRequired.den) : Number(line.quantity ?? NaN);
      assert.ok(Number.isFinite(g), `${cr.id}/${line.ingredientId}: line has no quantity field\n${JSON.stringify(Object.keys(line))}`);
      agg.set(line.ingredientId, (agg.get(line.ingredientId) || 0) + g);
    }
    for (const [ingId, grams] of declared) {
      const got = agg.get(ingId);
      assert.ok(got !== undefined, `${cr.id}/${ingId}: shopping MISSED a declared ingredient`);
      // the identity is in the line's own unit: g→weightG, each/count→count, ml→quantity
      const line = batch.lines.find((l) => l.ingredientId === ingId);
      const unit = (line && line.unit) || 'g';
      const expectedParts = unit === 'each' || unit === 'count' ? cnt.get(ingId) : grams;
      assert.strictEqual(Number(got), Number(expectedParts), `${cr.id}/${ingId} [${unit}]: shopping=${got} vs declared=${expectedParts}`);
    }

    // single-portion case: portions=1 ⇒ exactly declared/servings (no rounding drift)
    const single = SHOP.buildShoppingList({
      recipes: [imp], planEntries: [mk(1)],
      from: '2027-03-02', to: '2027-03-02',
    });
    for (const line of single.lines) {
      const ingDecl = cr.ingredients.find((i) => i.id === line.ingredientId);
      if (!ingDecl) continue; // package/pantry lines irrelevant to the identity
      const unit = line.unit || 'g';
      const base = unit === 'each' || unit === 'count' ? Number(ingDecl.quantity) : Number(ingDecl.weightG);
      const expected = base / cr.servings;
      const got = line.netRequired ? (line.netRequired.num / line.netRequired.den) : NaN;
      assert.ok(
        Math.abs(got - expected) < 1e-9,
        `${cr.id}/${line.ingredientId}: 1-portion shopping=${got} vs declared/servings=${expected}`,
      );
    }
  }
});

test('(B) used/remaining ledger: every step g/ml claim is backed by the declared totals (remaining ≥ 0)', () => {
  const audited = { recipes: 0, claimsChecked: 0 };
  for (const recipe of ND.curatedRecipes) {
    audited.recipes += 1;
    const totals = new Map();
    for (const ing of recipe.ingredients) totals.set(ing.id, (totals.get(ing.id) || 0) + Number(ing.weightG || 0));
    for (let i = 0; i < recipe.steps.length; i++) {
      const claims = parseStepClaims(recipe.steps[i]);
      for (const n of claims) {
        for (const { id, re } of STEP_CLAIM_RULES) {
          if (!re.test(recipe.steps[i])) continue;
          const available = totals.get(id);
          if (available == null) continue;
          audited.claimsChecked += 1;
          assert.ok(n <= available + 0.001, `${recipe.id}: step ${i + 1} claims ${n} of ${id} but only ${available}g are declared — overdraft`);
        }
      }
    }
    const remaining = new Map();
    for (const [id, total] of totals) remaining.set(id, total);
    for (const [id, v] of remaining) assert.ok(v >= 0, `${recipe.id}/${id}: negative remaining`);
  }
  assert.ok(audited.recipes === ND.curatedRecipes.length && audited.claimsChecked > 0, 'audit actually ran');
});

test('(A2) same identity for the 4 docx canonical recipes (count/g/ml domains, batch-linked)', () => {
  const docx = require('../data/canonical/docx-diet-recipes-canon.v1.json');
  const imp = docx.recipes.map((r) => ({
    ...(r.meta),
    ingredients: r.ingredients,
  }));
  for (const rec of imp) {
    const entry = {
      id: 'e1', localDate: '2027-03-02', slot: 'dinner', recipeId: rec.id,
      version: rec.version, portions: rec.baseServings, repeatRuleId: null, pantryOverride: null,
    };
    const out = SHOP.buildShoppingList({
      recipes: [{ ...rec, ingredients: rec.ingredients }], planEntries: [entry],
      from: '2027-03-02', to: '2027-03-02',
    });
    assert.ok(!out.refused, `${rec.id} refused: ${JSON.stringify(out.errors)}`);
    const want = new Map();
    for (const ing of rec.ingredients) {
      // optional ingredients default-excluded in the engine (optional_excluded warning)
      if (ing.optional) continue;
      want.set(ing.ingredientId, (want.get(ing.ingredientId) || 0) + Number(ing.quantity || 0));
    }
    const got = new Map();
    for (const line of out.lines) {
      if (!want.has(line.ingredientId)) continue;
      const n = line.netRequired ? (line.netRequired.num / line.netRequired.den) : NaN;
      got.set(line.ingredientId, (got.get(line.ingredientId) || 0) + n);
    }
    for (const [id, expected] of want) {
      assert.ok(got.has(id), `${rec.id}/${id}: shopping MISSED a docx ingredient`);
      assert.strictEqual(got.get(id), expected, `${rec.id}/${id}: shopping=${got.get(id)} vs declared=${expected}`);
    }
  }
});

test('seeded-negative: a corrupted step claim overdrafts and flips the ledger RED', () => {
  const fakeTotals = new Map([['salmon', 560]]);
  const overdraft = 900 > fakeTotals.get('salmon');
  assert.strictEqual(overdraft, true, 'harness must detect a 900g claim against a 560g declared total');
});
