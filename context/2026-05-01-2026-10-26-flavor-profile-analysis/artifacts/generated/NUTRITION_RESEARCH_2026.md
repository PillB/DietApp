# Nutrition & Portion Validation — Evidence Review (26 October 2026)

## Verdict and scope

The **uploaded source PDF is an opinion/perspective in JAMA**, *The 2025–2030 Dietary Guidelines for Americans*, by Dariush Mozaffarian, published online 14 January 2026 and in print 17 February 2026. It comments on federal dietary guidance; it does **not** contain the user's sex, age, current body mass, activity-calibrated expenditure, laboratory values, target energy prescription, ingredient nutrition labels, or verified recipes. It cannot individually certify weight-loss calories or macros.

The earlier v2 project claimed that its 29 recipes were “compliant after revision.” This is true only as an **ingredient/editorial review status**: the records have no weighed, food-composition-based calculation of calories, protein, carbohydrate, fat, fiber, saturated fat, sodium, or per-meal added sugar. Consequently the claims “all desserts ≤10 g added sugar” and “all portions appropriate for weight loss” **are not substantiated** without further measured inputs, especially for chocolate, sauces, honey, added fats, doughs, and serving yields.

The upgrade makes this limitation explicit and adds **seven new weighed, portion-controlled *variants***, based on the flavor map, distinct from the original 29 historical recipes. It does not overwrite the original prose or silently certify them. Seven variants have generic composition estimates with considerable uncertainty; no nutrient values are lab-verified.

## Evidence hierarchy and decisions

| Topic | Finding | Implementation |
|---|---|---|
| Weight-loss rate | CDC advises gradual loss, about 0.45–0.9 kg/week, more maintainable than fast loss | No aggressive mandatory rate or fixed weight-loss promise |
| Weight-loss energy | Sustained energy deficit matters; needs may change over time | Blank-by-default adult estimate; 300–500 kcal/day illustrative deficit, never auto-assign to user |
| Estimation model | Mifflin–St Jeor predicts resting needs better than several alternatives in review, but individual error is substantial | Expose raw equation, activity assumption and caution; link to NIDDK dynamic planner |
| Protein | PDF discusses the federal 1.2–1.6 g/kg/day target; editorial commentary questions universal benefits. Meta-analysis supports preserving lean mass with resistance exercise | User chooses the reference mass (can be goal weight); display illustrative range and CKD caution; do not claim it is universally correct |
| Fiber & plant foods | WHO 2023 recommends ≥25 g/day naturally occurring fiber and ≥400 g/day vegetables + fruit in adults | Display daily goals, not unsupported exact weekly compliance claims |
| Meal plate | NIH NIDDK describes roughly ½ plate vegetables/fruit, ¼ protein, ¼ whole-grain starch | Visual guide as flexible composition heuristic; do not restrict pasta/rice |
| Added sugar | PDF summarizes ≤10 g added sugar **per meal**, not a blanket measurement of all desserts | Mark chocolate, purchased condiments and mixed meal totals as *unverified* until checked against labels |
| Fat and processing | PDF emphasizes minimally processed foods, whole grains, olive oil, nuts, fish, unsweetened dairy | New recipes use measured oils, vegetables, grains and multiple protein sources |
| Sodium | US federal guidance limits total sodium for most adults and requires label/condiment assessment | Reduced-sodium sauce, unsalted stocks, but sodium totals **not certified** because brand values absent |
| Serving quantities | Recipe yield ≠ one person's appetite or one day's calories; raw vs cooked mass differs | State `servings:4`; ingredient mass labels specify dry/raw/cooked; schedule number of **individual servings**, not batches |

## Estimation assumptions and limits

**Energy estimator:** Mifflin–St Jeor resting estimate: 10 × weight (kg) + 6.25 × height (cm) − 5 × age (years) + 5 (male equation constant) or −161 (female equation constant). Daily expenditure estimate multiplies RMR by a user-selected activity factor. Deficit is subtracted from this maintenance estimate. The tool is only for adults 18–100, and not suitable for pregnancy, lactation, medical nutritional therapy, eating disorders, and other individual needs. Metabolic sex is an equation parameter, not a statement about identity. Conservatively flags examples below approximately 1200 kcal/day (female equation) or 1500 kcal/day (male equation) for professional review, **not a universal minimum** and not a validated boundary for all patients. NIDDK's dynamic planner is preferable to predicting weight trajectories.

**Protein calculator:** The default reference mass is the current entered mass, with optional explicit alternative; using actual weight at higher adiposity can overstate protein needs for some people. No preset mass or goal is used. Users and clinicians should decide the appropriate reference. Kidney disease, high-risk medications and other conditions require individual guidance.

**Nutritional estimates:** Seven weighed recipe variants carry generic reference rows for energy, protein, carbohydrate, fat and fiber per 100 g. These are *illustrative approximations based on standard food composition profiles* (conceptually USDA FoodData Central). They are **not** FDC item-ID audited. Their uncertainty can readily exceed ±20–30% through brand differences, oil uptake, cooking loss, edible yield, and unknown condiments. Never use them to claim clinical precision. Sodium and added sugars are **not quantified**: names like “reduced-sodium soy” and “85% dark chocolate” do not reveal their full labels. The energy numbers represent single servings of entire recipes as entered, not a whole-day menu; unused recipe servings do not mean leftovers were eaten.

**Measuring & aggregation:** A 4-serving batch scheduled for one person contributes one quarter of ingredient amounts to shopping demand. If four people eat the batch, shopping demand equals the full batch. Fractional quantities sum on canonical ingredient ID plus unit: 0.5 onion + 2 onions = 2.5 onions; g and ml are **never** silently added. Batch size, wastage and practical store pack sizes are separate from ingredient demand. Repetitions are counted on every scheduled date. The prototype treats the upcoming Monday–Sunday as the default buying week and supports arbitrary ranges.

**Examples to verify before shopping:** For protein bowls, specify whether salmon and beef weights are raw. For rice/quinoa/pasta, weights are dry; beans are cooked. Quantify dressings and sauces, especially oils and soy sauce; determine trim and edible yield. For mousse, tart, tiramisu and other desserts, calculate **all** added sugars (honey, added table sugar, sweetened purchased ingredients, chocolate) per plated portion and *then* sum dessert with any other added sugar consumed in the same meal. Do not assume “natural” honey is exempt from added sugar rules.

## Recipe audit and upgrade scope

The `nutrition-reviewed.json` and `assets/js/nutrition-data.js` include **29 original recipes with individualized flags**. All are marked `review-needed` for nutrient certification because exact, validated nutrient totals are absent. Specific areas flagged include sugar-heavy desserts, sodium-dense fermented condiments, full-fat dairy and fat-rich meals, and insufficient vegetables. No medical-nutrition compliance claim is made. The following **seven additional, structured** recipe variants have measured ingredient amounts and an illustrative per-portion macro projection:

1. Nikkei salmon & sesame brown-rice bowl.
2. Wok-charred chifa lomo with quinoa.
3. Ají-verde crispy chicken tacos and cabbage.
4. Artichoke, mushroom and cacio e pepe pasta.
5. Ají-tomato shakshuka with potato and whole-grain pita.
6. Birria-style beef, black bean and brown-rice bowls.
7. Lúcuma, cacao and pistachio breakfast parfait.

These dishes are inspired by recurrent Nikkei, chifa, tacos, creamy pasta, eggs, braised meat and chocolate preferences in the delivery-history flavor map. They retain substantial carbohydrates, dietary fat, cheese, sauces, and vibrant contrasts instead of defaulting to bland or low-carb dishes. They intentionally contain more vegetables and fiber and quantified oils/sauces, not an unsubstantiated claim to any exact “ideal macro split.”

## Illustrative per-serving composition — NOT verified nutrition labels

These values are **approximately calculated from generic food composition rows**, not branded product data. They are useful for spotting unusually large serving sizes, not for prescribing a daily intake. All seven new variants serve four people when cooked as written, unless scaled by the scheduler. Rounding is to the nearest g/kcal; plausible real-world uncertainty is high.

| New weighed recipe variant | kcal/serving (approx) | Protein / Fiber (g, approx) |
|---|---:|---:|
| Nikkei salmon rice bowl | 763 | 44 / 11 |
| Chifa lomo quinoa | 624 | 43 / 11 |
| Ají verde chicken tacos | 595 | 49 / 12 |
| Artichoke mushroom cacio e pepe | 566 | 31 / 15 |
| Ají-tomato shakshuka with pita | 600 | 29 / 12 |
| Birria, bean & brown rice bowls | 826 | 48 / 18 |
| Lúcuma cacao yogurt parfait | 762 | 36 / 17 |

Do not sum these as a daily diet unless the breakfast, lunch, dinner, snacks and beverages actually consumed are known. A 762-kcal substantial parfait is not automatically a small snack; an 826-kcal birria entrée can fit some energy plans and not others. The proportions intentionally preserve starch and indulgent sauces.

## Known gaps / non-negotiable next steps for production

- **[OPEN] 29 original recipes**: manually break every prose ingredient entry into ingredient ID, edible grams/ml, raw/cooked state, recipe yield, product label, and handling of leftovers; rerun per-recipe tests.
- **[OPEN] FoodData Central IDs**: bind each ingredient to an authoritative matching FDC item and calculation provenance, with credible variance bands. Replace illustrative per-100 g dictionary values and add sodium/saturated fat/added sugars.
- **[OPEN] Restaurant-grade yield**: pilot cook each recipe, weigh finished output (including sauce/dressing) and per-person plated mass; record measurements across two kitchen runs.
- **[OPEN] User-specific targets**: obtain *current* adult age, height, body mass, level of activity, nutritional constraints, medication context and professional advice before approving a customized energy prescription; none are inferred from old sessions.
- **[OPEN] Full-day nutrition coverage**: the default upcoming-week schedule has **one dinner per day**, not complete breakfast/lunch/dinner; never present aggregate dinner macros as whole-day intake.
- **[OPEN] Nutrition-label audit**: dark chocolate, reduced-sodium sauces, breads, dairy, canned ingredients and sweet condiments require actual Lima-market package labels.
- **[OPEN] Internationalization**: this module currently offers EN/ES for controls; complete translations and professional localization review across additional languages remains unfinished.
- **[OPEN] GitHub deployment**: project is static and ready to publish, but is not pushed or deployed without the user's repository authorization. Never publish the private raw order history by accident.

## Primary sources

1. Uploaded JAMA perspective by Mozaffarian, *The 2025–2030 Dietary Guidelines for Americans* (2026) — local PDF in private project data folder.
2. CDC, **Steps for Losing Weight** (2025): https://www.cdc.gov/healthy-weight-growth/losing-weight/
3. NIDDK/NIH, **About the Body Weight Planner**: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
4. NIDDK, **Research Behind the Body Weight Planner** (Hall et al.): https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner
5. Frankenfield et al., **Comparison of predictive equations for resting metabolic rate** (systematic review): https://pubmed.ncbi.nlm.nih.gov/15883556/
6. WHO, **Carbohydrate intake for adults and children** (2023): https://www.who.int/news/item/17-07-2023-who-updates-guidelines-on-fats-and-carbohydrates
7. NIDDK/NIH, **Your Game Plan to Prevent Type 2 Diabetes**, plate method: https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-type-2-diabetes/game-plan
8. U.S. government, **Current Dietary Guidelines 2025–2030**: https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines/current-dietary-guidelines
9. Systematic review, **Resistance exercise during dietary weight loss**: https://pubmed.ncbi.nlm.nih.gov/40909191/
10. USDA **FoodData Central** (future ingredient matching/food composition): https://fdc.nal.usda.gov/

## Safety & interpretation

The app is a cookbook/planning prototype, not a registered dietitian, clinical weight-management product, medical device or a personalized prescription. Avoid using calorie estimator results as a measure of worth or substituting them for clinical advice. A person can choose a nutritionally sufficient, flavorful plan while pursuing gradual weight loss if appropriate for them. This audit is about whether available data **supports** claims, and makes unsupported claims visible rather than hiding them.
