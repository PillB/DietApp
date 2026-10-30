/*
 * P3.5/F6 — es-PE callsigns + synonyms for canonical ingredient ids.
 * STATUS: 'draft-store-plausible-needs-native-review' — names chosen to match
 * the vocabulary a Lima shopper will find at Wong/Metro/Plaza Vea (per owner
 * correction 2026-10-30: e.g. 'chocllo superior' is NOT real; chocllo in Peru
 * is corn cob). Beef-cut mappings marked approximate — exact cut identification
 * is a butchery-tradition question, not settled by a machine draft.
 * Primary name = what to look for in-store; synonyms = match robustness ONLY
 * (matching candidates, never automatic substitutions per AGENTS.md §6).
 * Browser (window.FoodNamesEsPe) + Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FoodNamesEsPe = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REVIEW_STATUS = 'draft-store-plausible-needs-native-review';

  /** Banned tokens: owner-corrected examples of machine nonsense (peru-irrelevant). */
  const FORBIDDEN = ['chocllo superior', 'cocazuela', 'grfa'];

  const NAMES = {
    salmon: 'salmón',
    chicken_breast: 'pechuga de pollo',
    beef_sirloin: 'res: lomo',
    beef_chuck: 'res: pulpa paleta (equiv. aproximada a chuck)',
    egg: 'huevo',
    brown_rice_dry: 'arroz integral',
    quinoa_dry: 'quinua',
    wholewheat_pasta_dry: 'fideos integrales',
    corn_tortilla: 'tortilla de maíz',
    wholewheat_pita: 'pan pita integral',
    rolled_oats_dry: 'avena hojuelas',
    beans_cooked: 'menestras',
    edamame: 'edamame',
    artichoke: 'alcachofa',
    mushroom: 'hongos',
    tomato: 'tomate',
    onion: 'cebolla',
    bell_pepper: 'pimiento',
    greens: 'espinaca o verduras de hoja',
    broccoli: 'brócoli',
    cucumber: 'pepino',
    carrot: 'zanahoria',
    avocado: 'palta',
    cabbage: 'repollo',
    lime: 'limón',
    garlic: 'ajo',
    olive_oil: 'aceite de oliva',
    sesame: 'ajonjolí',
    parmesan: 'queso parmesano',
    pecorino: 'queso pecorino',
    feta: 'queso feta',
    greek_yogurt: 'yogur griego',
    miso: 'pasta de miso',
    soy_sauce: 'sillao',
    vinegar: 'vinagre',
    cumin: 'comino',
    chili: 'ají',
    potato: 'papa',
    nuts: 'frutos secos',
    cocoa: 'cocoa en polvo',
    lucuma: 'lúcuma',
    berries: 'berries',
    dark_chocolate: 'chocolate amargo',
    water: 'agua',
    herbs: 'hierbas frescas',
    vegetable_stock: 'fondo de verduras',
  };

  /** Matching-robustness synonyms (store variants + common regional words). */
  const SYNONYMS = {
    salmon: ['salmón fresco', 'salmón congelado'],
    beef_chuck: ['pulpa de brazo', 'carne para guisar'],
    brown_rice_dry: ['arroz entero', 'arroz grano integral'],
    quinoa_dry: ['quinoa', 'quinua real'],
    wholewheat_pasta_dry: ['pasta integral', 'espagueti integral'],
    corn_tortilla: ['tortillas de maíz'],
    rolled_oats_dry: ['avena tradicional', 'copos de avena'],
    beans_cooked: ['menestra cocida', 'frijoles cocidos', 'legumbres cocidas'],
    edamame: ['vainitas de soya', 'porotos de soya'],
    artichoke: ['alcaucil', 'alcauciles en conserva'],
    mushroom: ['champiñones', 'setas'],
    greens: ['hojas verdes', 'acelga', 'espinaca'],
    bell_pepper: ['pimiento rojo', 'pimiento verde'],
    cucumber: ['pepinillo'],
    avocado: ['aguacate'],
    cabbage: ['col'],
    sesame: ['sésamo'],
    parmesan: ['parmesano rallado', 'queso rallado parmesano'],
    pecorino: ['pecorino romano'],
    greek_yogurt: ['yogurt griego'],
    soy_sauce: ['salsa de soya', 'sillao de soya'],
    cumin: ['comino en polvo'],
    chili: ['ají amarillo', 'rocoto', 'ají limo'],
    cocoa: ['cacao en polvo'],
    berries: ['arándanos', 'frutillas', 'frambuesas'],
    nuts: ['nueces', 'almendras', 'mixtura de frutos secos', 'castañas'],
    dark_chocolate: ['chocolate 70%', 'cobertura amarga'],
    vegetable_stock: ['caldo de verduras', 'consomé de verduras'],
    onion: ['cebolla roja', 'cebolla blanca'],
    lime: ['limón sutil', 'limón verde'],
    herbs: ['perejil', 'cilantro', 'culantro'],
  };

  const ID_OK_RE = /^[a-z_]+$/;

  function nameForIngredient(id) {
    if (typeof id !== 'string' || !ID_OK_RE.test(id)) return null;
    return NAMES[id] == null ? null : NAMES[id];
  }

  function synonymsFor(id) {
    return SYNONYMS[id] == null ? [] : SYNONYMS[id];
  }

  function bilingual(id, enFallback) {
    const es = nameForIngredient(id);
    return { es, syn: synonymsFor(id), en: enFallback != null ? enFallback : id, draft: true };
  }

  /** deny list scan: any draft that re-enters banned nonsense is an error signal. */
  function selfAudit() {
    const bad = [];
    for (const [id, es] of Object.entries(NAMES)) {
      const text = `${es} ${(SYNONYMS[id] || []).join(' ')}`.toLowerCase();
      for (const token of FORBIDDEN) if (text.includes(token)) bad.push({ id, token });
    }
    return { ok: bad.length === 0, bad };
  }

  return { REVIEW_STATUS, FORBIDDEN, nameForIngredient, synonymsFor, bilingual, selfAudit, NAMES, SYNONYMS };
});
