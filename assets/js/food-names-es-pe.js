/*
 * F3.5/F6 support — es-PE callsigns for canonical ingredient ids.
 * STATUS: DRAFT, machine-assisted. NOT yet reviewed by a native/es-PE reader;
 * per OPEN_CODE_HANDOVER.md §9 and AGENTS.md, unreviewed translations must be
 * labeled — consumers must read the REVIEW_STATUS and must not present drafts
 * as polished Spanish (no fake fluency). Safety-critical texts are NOT covered
 * here (that gate is stricter and belongs to recipe steps).
 * Browser (window.FoodNamesEsPe) + Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FoodNamesEsPe = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REVIEW_STATUS = 'draft-machine-assisted-needs-native-review';

  const NAMES = {
    salmon: 'salmón',
    chicken_breast: 'pechuga de pollo',
    beef_sirloin: 'lomo (res)',
    beef_chuck: 'res: pala (chuck)',
    egg: 'huevo',
    brown_rice_dry: 'arroz integral',
    quinoa_dry: 'quinua',
    wholewheat_pasta_dry: 'pasta integral',
    corn_tortilla: 'tortilla de maíz',
    wholewheat_pita: 'pan pita integral',
    rolled_oats_dry: 'avena (hojuelas)',
    beans_cooked: 'menestras cocidas',
    edamame: 'vainitas de soya',
    artichoke: 'alcaucil (alcachofa)',
    mushroom: 'hongos (champiñones y setas)',
    tomato: 'tomate',
    onion: 'cebolla',
    bell_pepper: 'pimiento',
    greens: 'verdes de hoja',
    broccoli: 'brócoli',
    cucumber: 'pepinillo',
    carrot: 'zanahoria',
    avocado: 'palta',
    cabbage: 'repollo',
    lime: 'limón',
    garlic: 'ajo',
    olive_oil: 'aceite de oliva',
    sesame: 'ajonjolí',
    parmesan: 'parmesano',
    pecorino: 'pecorino',
    feta: 'feta',
    greek_yogurt: 'yogurt griego',
    miso: 'pasta de miso',
    soy_sauce: 'sillao',
    vinegar: 'vinagre',
    cumin: 'comino',
    chili: 'ají',
    potato: 'papa',
    nuts: 'nueces y mixtura de frutos',
    cocoa: 'cacao en polvo',
    lucuma: 'lucuma',
    berries: 'berries (mixtura frutas rojas)',
    dark_chocolate: 'chocolate amargo',
    water: 'agua',
    herbs: 'hierbas frescas',
    vegetable_stock: 'fondo (caldo) de verduras',
  };

  const KNOWN_OK_RE = /^[a-z_]+$/;

  function nameForIngredient(id) {
    if (!KNOWN_OK_RE.test(String(id))) return null;
    return NAMES[id] === undefined ? null : NAMES[id];
  }

  /** nameOrFailsafe: NEVER invent. Missing name returns null + caller reasons. */
  function nameBilingual(id, enFallback) {
    const es = nameForIngredient(id);
    return { es, en: enFallback != null ? enFallback : id, draft: true };
  }

  return { REVIEW_STATUS, nameForIngredient, nameBilingual, NAMES };
});
