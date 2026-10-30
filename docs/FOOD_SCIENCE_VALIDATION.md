# Chef × food scientist × food safety QA protocol

## No blanket certification
The baseline PDF is a JAMA perspective about the 2025–2030 Dietary Guidelines for Americans, not a user-specific weight-loss prescription or a food safety standard. All 29 legacy recipe records need individual reassessment. Seven weighed recipes use *illustrative* composition estimates; they are not kitchen-tested or label-verified. `validated` must mean **a documented review of ingredient composition + execution + safety**, not 'the AI says yes'.

## Gate A — Ingredient and diet audit for EACH recipe
- Confirm name and cultural inspiration; match flavor profile evidence rather than generic substitutions.
- Explicit `ingredients` per subcomponent, metric weights and optional status, edible/raw/drained/cooked basis, number of servings and measured output yield, tools, active/passive/prep/rest/cook/release/cool times.
- Use INS Peruvian TPCA (2023) for native foods and USDA FoodData Central or actual brand label for gaps. Record composition `sourceId`, reference basis and date. No fabricated exact energy, sodium, saturated fat or added sugar for unknown label.
- Count honey, syrup, cane/raw/coconut sugar as added/free sugar as relevant; processed meat doesn't become unprocessed when 'nitrate-free'. Check saturated fat/sodium across entire menu, not from an isolated ingredient alone.
- No defaults for caloric deficits, protein g/kg or weight-target compliance unless physical parameters, activity and goal explicitly supplied.
- Allergens: milk, eggs, wheat/gluten, fish, shellfish, soy, peanuts, nuts, sesame; alcohol must be labeled including mirin/cooking wine; substitutes documented as culinary alternatives not necessarily nutritionally equivalent.

## Gate B — Step-by-step technical kitchen validation
For each step, independent checks: sequence, available equipment, temp, time, cross-contamination, sensory endpoints, expected reduction/texture, service temperature. Confirm mass balance: liquids absorbed/evaporated, raw→cooked yield, sauce amounts, actual output 4 servings.

**Important concrete anti-patterns found in historical generated material:**
- A dessert with honey/cane sugar and chocolate is NOT within a 10 g added-sugar/meal claim absent actual computation.
- Cold-smoked home fish or lightly cured fish is not made parasite/pathogen safe just by calling it sushi-grade or curing two hours; require credible fish sourcing and safety method.
- Raw egg mousse/aioli and undercooked poached eggs require risk warnings or pasteurized egg alternatives, especially for higher-risk eaters.
- Pressure-cooker instant recipe cannot be derived solely by deleting a stovetop braising hour count; device pressure, heat-up/release, minimum liquid, viscosity and fill limit are essential.
- 'Citrus cooks ceviche' is a texture/protein change, not a validated pathogen kill step.

## Gate C — Official safety parameters (verify exact recipe applicability)
- Chicken/poultry **74°C / 165°F** minimum core; ground beef **71°C / 160°F**, fish **63°C / 145°F**; reheating leftovers **74°C / 165°F**. Some intact beef cuts follow a **63°C with 3-min rest** rule; type-specific rather than blanket. Eggs: firm yolk/white or safe pasteurization equivalents. https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures
- Chill within 2 hours (1 hour if >32°C ambient); maintain fridge ≤4°C, cooked food usually **3–4 days** refrigerator; freeze longer storage. Divide in shallow containers; note recipes containing rice require prompt cooling and separation. https://ask.fsis.usda.gov/article/Como-se-manipulan-las-sobras-de-manera-segura
- Seafood supply, storage, allergens, produce sanitation and cooking temp sourced from official guidance; risk categories individualized.
- Device-specific Instant Pot directions based on manual and tested recipe; no 'cook on high pressure 12min' unsupported assumptions. Fill maximum and foaming grain/legume caveats; pressure release safety.

## Gate D — Palate and feasibility review
Test 4 portions cooked in specified pot at home: weighing, prep duration, evaporation, tasting (umami/acidity/heat/texture), plates and leftover reheating. Keep testers' ratings separated from order-derived preferences. Provide substitutions available locally and unavailable ingredient equivalents. Use a version bump after every modification. Keep `validatedKitchen: false` until actual kitchen test.

## Recipe review evidence log schema
```
recipeId | version | date | ingredientAudit | nutrientAudit | safetyAudit |
stepAudit | instantPotManual | kitchenTrial | sourceURLs | unresolvedIssues | reviewer
```
Review each step: pre-check → validate against reference → revise → post-check; block release until all essential ingredients and safety steps are resolved. Safety-critical issues must never be 'auto-fixed' based solely on model agreement.

## Scientific/primary references
- Peruvian TPCA 2023 edition: https://repositorio.ins.gob.pe/items/945f2705-5700-4561-9281-974adb816604
- Peruvian composition online: https://tablasperuanas.ins.gob.pe/
- USDA FoodData Central: https://fdc.nal.usda.gov/
- FoodSafety.gov temperatures: https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures
- USDA cooked food handling: https://ask.fsis.usda.gov/article/Como-se-manipulan-las-sobras-de-manera-segura
- WHO 2026 healthy diet: https://www.who.int/es/news-room/fact-sheets/detail/healthy-diet
- Original uploaded PDF: `data/private/dariush-mozaffarian-the-2025-2030-dietary-guidelines.pdf` (private local source; do not publish).
