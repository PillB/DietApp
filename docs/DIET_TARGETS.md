# Diet targets — deficit + satiety engine (P-Diet, 2026-10-31)

Inputs analyzed (PRIVATE derivatives in `data/private/extraction-summaries/`, identity redacted to "professional nutritionist (identity withheld)" per the owner's standing instruction):

1. `weekly diet.xlsx` — 'plan 1': 7-day Peru-shop menu (LUNES…DOMINGO) with slots
   DESAYUNO (muesli + yogurt islandés SKYR + leche 0%), 11am (fruit/15 g freeze-dried
   MALLI or 7 almonds), ALMUERZO (large salad volumes + lomo/pollo/pescado + portioned
   starch: ½ tza lentejas/frejoles, choclo, camote, integral pasta/rice),
   REFRIGERIO (fruit/yogurt), CENA (fish/chicken/sangrecita + pan integral queso fresco
   + salads + stevia infusions), plus owner-sheet notes: 2 L water/day, DHA capsule
   AM, optional zinc/magnesium effervescent PM, brand callouts (MOLINO ROBO/UNION/PYC,
   SKYR Plusa, GLORIA/LAIVE, CARABELA conservas, MALLI).
2. `RECETAS- LIBRE.docx` — 4 weighed draft recipes: Galletas de avena (1 p),
   Pescado al ajonjolí (1 p; 120 g fish + 2 claras + ajonjolí + veg), Muesli frutado (1 p),
   Budín de plátano (4 p).

## Structural interpretation (why the reference already leans satiety)
- Portables: high-water salads (2–3 tza per meal), lean proteins every meal,
  starch cut in half-measures, sweets bound to fruit, dairy 0%.
- The pattern is a portion-controlled plate, not a keto/fast: carbs remain from
  whole legumes/organic potatoes/whole grains — ENRICHED VERSION below keeps that
  cultural base (cebiches, ajonjolí, ajonjolí biscuits) while adding protein/fibre
  floors per the engine.

## Engine defaults (all cited, no invented numbers) — `assets/js/diet-core.js`
| Element | Value | Source |
|---|---|---|
| daily kcal gate | floor 1200; <1500 = 'aggressive' requiring owner-acknowledged clinician review | existing estimateEnergy guardrails + published supervised-plan floors |
| protein | ≥1.2–1.6 g/kg/day; slot floors 20/30/25/8 g (desk/desk/desk/snacks) | published weight-management band; consistent with `nutrition-reviewed.json proteinRange` |
| fiber | ≥25 g/day; slot floors 5/10/8/3 g | 2025-2030 DGA Adequate Intake midpoints |
| added sugar | <10% kcal (aggressive: <5%) | DGA |
| saturated fat | <10% kcal | DGA |
| sodium | <2300 mg/day distributed by meal share | DGA chronic-disease roundup |
| vegetables | ≥2-3 servings/day incl. greens most days | plate/share model; matches the reference's salad volumes |
| water | ~2 L/day reminder | owner sheet note (kept as a reminder only) |

## Satiety scoring (`DietCore.satietyScore`)
score in [0..10] from protein/100 kcal + 2×fiber/100 kcal, −10×sugar-energy share,
+1 if energy density ≤ 1.0 kcal/g (published low-ED zone), −1.5 if >2.5 kcal/g.

## What the deficit-plan means here (safety, stated NOT absorbed)
- The engine NEVER stores the owner's age/weight; targets are STRUCTURE, not
  individualized prescription. The owner enters their personal parameters
  (Nutrition & Portions panel) upstream; the code only refuses below-floor numbers
  and demands an acknowledged review flag for aggressive ones.
- Supplements (DHA, zinc/magnesium) surface as `clinician-verify`, never enforced.
- 'Aggressive' = typical 750 kcal deficit band within 1200–1500 kcal; covered by
  the review gate + watch-side signals (fatigue/dizziness/performance) as text caveats.

## Next steps (menu/recipe uplift pipeline)
1. Convert the docx's 4 draft recipes into canonical RecipeVersions (weighed):
   estimate amounts from the text (aisles listed per Macedonia units + typical
   counts), weight-based measure via typical food chemistry — then mark
   `needs kitchen validation` pending owner weigh-in (P4.4 worksheet).
2. Add MEAL TARGET rows to the served Nutrition panel (mealTargets at 1200/1400/1500
   presets chosen in the UI; acknowledgment checkbox for the aggressive band).
3. Improve recipes iteratively: raise protein floors (Greek yogurt, quinoa, legumes)
   & fiber floors (greens volume) while respecting flavor-atlas preferences
   (Peru staples: ajonjolí/rocoto/limón/palta; temperature/texture top nodes from P5.4).
