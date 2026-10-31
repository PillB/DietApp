 /**
  * Cook-for-engineers docx-manifest → TPCA composition-key bridge.
  * The docx recipes use their own ingredient manifest IDs while the TPCA
  * composition table is keyed by canonical food names (egg, rolled_oats_dry).
  * Each bridge entry is a DELIBERATE mapping decision with a reason logged.
  */
'use strict';

const BRIDGE = {
  clara_huevo: {
    compositionKey: null, // J2 is an EGG WHITE, not a whole egg — override required
    overrideRow: {
      code: 'J2', name: 'Huevo de gallina, clara de', grupo: 'HUEVOS Y DERIVADOS',
      per100g: { kcal: 51, proteinG: 10.9, fatG: 0.2, carbG: 0.7, fiberG: 0, sodiumMg: null, calciumMg: 7, ironMg: 0.08, zincMg: 0.03 },
      basis: 'raw',
      note: 'TPCA J2 row crawled verbatim: 51kcal, 10.9g prot, 0.2g fat, 0.7g carb per 100g; Ca 7, Fe 0.08, Zn 0.03',
    },
    reason: 'egg white ≠ whole egg; the docx recipe uses 33 g egg white per unit',
  },
  avena_hojuelas: { compositionKey: 'rolled_oats_dry', overrideRow: null, reason: 'same food; TPCA A43 row' },
  yogurt_griego_0: {
    compositionKey: 'greek_yogurt',
    overrideRow: {
      code: 'G38', name: 'Yogurt griego natural sin azúcar', grupo: 'LECHES Y DERIVADOS',
      per100g: { kcal: 79, proteinG: 4.0, fatG: 3.9, carbG: 7.9, fiberG: null, sodiumMg: null, calciumMg: null, ironMg: null, zincMg: null },
      basis: 'raw/dairy',
      note: 'TPCA G38 = the closest generic Peru row; brand SKYR needs owner label',
    },
    reason: "docx 0% whole batch = TPCA G38 sin azúcar",
  },
  yogurt_estilo_island: { compositionKey: 'greek_yogurt', overrideRow: null, reason: 'same yogurt family; TPCA G38 row is the source' },
  filete_pescado_blanco: { compositionKey: 'filete_pescado_blanco', overrideRow: null, reason: 'direct mapping; the canonical row is already present with the correct per100g values' },
  ajonjoli_tostado: { compositionKey: 'sesame', overrideRow: null, reason: 'same food (sesame/ajonjolí); toasting does not materially change macros per 100 g' },
  quinua_graneada: { compositionKey: 'quinoa_dry', overrideRow: null, reason: 'same grain (quinua granular form); TPCA A54 row is the composition source' },
  cebolla_blanca_pluma: { compositionKey: 'onion', overrideRow: null, reason: 'pluma is the CUT the owner sees in the recipe, not a distinct food; TPCA B26 onion row is the correct match' },
  tomate_cherry: { compositionKey: 'tomato', overrideRow: null, reason: 'same food (sesame/ajonjolí); toasting does not materially change macros per 100 g' },
  zanahoria_rallada: { compositionKey: 'carrot', overrideRow: null, reason: 'rallada is the CUT the owner sees in the recipe, not a distinct food; TPCA B85 carrot row is the correct match' },
  lechuga_picada: { compositionKey: 'lechuga_picada', overrideRow: null, reason: 'direct mapping; the canonical row is already present with the correct per100g values' },
  vinagre_liquido: { compositionKey: 'vinegar', overrideRow: null, reason: 'direct mapping; the canonical row is already present with the correct per100g values' },
  canela_polvo: { compositionKey: 'canela_polvo', overrideRow: null, reason: 'direct mapping; the canonical row is already present with the correct per100g values' },
  aceite_oliva: { compositionKey: 'olive_oil', overrideRow: null, reason: 'direct mapping; the canonical row is already present with the correct per100g values' },
  queso_fresco_light: { compositionKey: 'queso_fresco_light', overrideRow: null, reason: 'direct mapping; the canonical row is already present with the correct per100g values' },
  platano_bizcochito: {
    compositionKey: null,
    overrideRow: {
      code: null, name: 'Plátano bizcochito (NS)', grupo: 'TUBÉRCULOS/BANANO',
      per100g: null, basis: 'NS',
      note: 'TPCA does not curate plátano bizcochito by specific code; NS is honest',
    },
    reason: 'NS until the owner provides a row; potato would be WRONG (different fruit)',
  },
  fruta_picada_estado: {
    compositionKey: null,
    overrideRow: { code: null, name: 'NS: composite fruta picada', per100g: null, basis: 'NS', note: 'composite fruit; owner tracks per session' },
    reason: 'composite fruit family; no single TPCA code; NS honest',
  },
};

function applyBridge(compositionRows, docxIngredientId) {
  const b = BRIDGE[docxIngredientId];
  if (!b) return compositionRows[docxIngredientId] || null;
  if (b.overrideRow) return b.overrideRow;
  if (b.compositionKey && compositionRows[b.compositionKey]) return compositionRows[b.compositionKey];
  return null;
}

(function (root, f) {
  const exports = f();
  if (typeof module === 'object' && module.exports) module.exports = exports;
  root.CompositionBridge = exports;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  return { BRIDGE, applyBridge };
});
