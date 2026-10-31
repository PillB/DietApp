# Recipe-by-recipe evidence inventory — 2026-10-31
**Source:** `meal-plan-data.json` at audit PR #1. This is a **risk/validation inventory**, not cooking trials or a certification.

All 29 legacy recipes retain prose ingredient lines, not fully canonicalized measured uses or independently measured cooked yields. Therefore each is **NOT READY for quantitative step-mass balance or nutrient verification**. Validate cooking science with an independent kitchen test before replacing these statuses. Do not silently change original measurements.

| # | Recipe / declared time | Priority kitchen verification |
|---:|---|---|
| 1 | Artichoke Benedict with Roasted Trout (1 h 15 min) | Kitchen cook-through, serving yield and staged ingredient totals |
| 2 | Birria Ramen with Sous-Vide Egg (6 h (includes braising)) | Runny egg; pasteurized/lightly cooked disclosure; measure bath profile |
| 3 | Brown Rice Risotto alla Parmigiana with Artichokes & Scallops (1 h 10 min (includes soaking)) | Species/size, protein core-temperature and yield |
| 4 | Chifa Lomo Saltado Quinoa Bowl (50 min) | Dry/cooked grain ratios; moisture and sauce yield |
| 5 | Chocolate-Cinnamon Churro Sundae with Dark Chocolate Sorbet (2 h (includes chilling)) | Raw-egg/dairy safety, setting and chilling |
| 6 | Crispy Fish Tacos with Mango Slaw & Black Bean Salad (1 h) | Species/size, protein core-temperature and yield |
| 7 | Dark Chocolate & Chicha Morada Mousse with Roasted Pineapple (2 h (includes chilling)) | Raw-egg/dairy safety, setting and chilling |
| 8 | Deconstructed Acevichado Cod with Quinoa Crust & Aji Emulsion (1 h 30 min) | Species/size, protein core-temperature and yield |
| 9 | Elote-Style Corn Ribs (40 min) | Kitchen cook-through, serving yield and staged ingredient totals |
| 10 | Grilled Chicken Parmigiana with Aji Verde & Quinoa Salad (1 h 15 min) | Dry/cooked grain ratios; moisture and sauce yield |
| 11 | Korean Bulgogi Breakfast Burrito (50 min) | Meat cut thickness, internal temperature, cooking loss |
| 12 | Lucuma Tiramisu (4 h (includes chilling)) | Raw-egg/dairy safety, setting and chilling |
| 13 | Mapo Tofu with Quinoa & Sichuan Peanuts (45 min) | Dry/cooked grain ratios; moisture and sauce yield |
| 14 | Miso-Glazed Salmon Bowl with Brown Rice & Sesame Kale (50 min) | Species/size, protein core-temperature and yield |
| 15 | Nikkei Quinoa Acevichado Salad (40 min) | Dry/cooked grain ratios; moisture and sauce yield |
| 16 | Parmesan-Reggiano Crisps with Aji Amarillo Aioli (30 min) | Kitchen cook-through, serving yield and staged ingredient totals |
| 17 | Roasted Plantain Chips with Rocoto Dip (40 min) | Kitchen cook-through, serving yield and staged ingredient totals |
| 18 | Slow-Roasted Salmon & Avocado Whole-Grain Bagel (3 h (includes proofing)) | Dough proofing, hydration, bake yield and times |
| 19 | Sous-Vide Short Ribs with Purple Potato Purée & Sautéed Greens (24 h (includes sous-vide)) | Verify bag thickness, cut type, 68°C/24h outcome, chilling |
| 20 | Sous-Vide Eggs (50 min) | Runny egg; pasteurized/lightly cooked disclosure; measure bath profile |
| 21 | Spaghetti Cacio e Pepe Oatmeal (25 min) | Dry/cooked grain ratios; moisture and sauce yield |
| 22 | Takoyaki-Inspired Omelette Roll (35 min) | Kitchen cook-through, serving yield and staged ingredient totals |
| 23 | Whole-Grain Chilaquiles with Poached Eggs and Salsa Roja (50 min) | Kitchen cook-through, serving yield and staged ingredient totals |
| 24 | Whole-Grain Croissant with Roast Turkey & Queso Fresco (12 h (includes laminating/proofing)) | Dough proofing, hydration, bake yield and times |
| 25 | Whole-Grain Gnocchi a la Huancaína with Grilled Prawns (1 h 20 min) | Species/size, protein core-temperature and yield |
| 26 | Whole-Grain Pizza Diavola with Spicy Mushrooms & Rocoto Honey (18 h (includes dough fermentation)) | Dough proofing, hydration, bake yield and times |
| 27 | Whole-Grain Spaghetti Puttanesca with Ají Panca Seafood (45 min) | Species/size, protein core-temperature and yield |
| 28 | Whiskey Pecan Dark Chocolate Tart (4 h (includes chilling)) | Sugar/oil portion, temperature and texture trials |
| 29 | Whole-Grain Bagels (3 h) | Dough proofing, hydration, bake yield and times |

## Coverage accounting
- 29 legacy: each has declared serving count, at least one method step and prose ingredient groups; **none** is certified as a complete quantity-per-step canonical ledger.
- 7 curated nutrition variants: inspect `nutrition-reviewed.json`, count, unit state, derived nutrition provenance, and kitchen yield separately.
- 4 canonical DOCX: 22 planned full-use allocations across 13 steps; **not measured physical consumption**. See `tests/step_consumption.test.cjs`.
- Cross-check between original weekly lists and the canonical shopping engine is **not universally provable** while each legacy ingredient remains a prose string. No optimistic 100% correspondence claim.

## Independence of culinary verification
Per recipe require (1) independent authoritative source or controlled experimental reference; (2) exact raw/dry/cooked ingredient base and tool/heat geometry; (3) one independently observed cook-through with ingredient usage + discard and cooked yield, flavor assessment; (4) safety and allergen check; (5) numerical food-composition calculation with database IDs; (6) repeated tester with clear release signature.
For sous-vide: distinguish organoleptic texture from lethality/pasteurization. Thick meat can take substantially longer than thin food to equilibrate.

## Primary research pointers
- Anova egg 63°C/45min empirical states: https://anovaculinary.com/en-ca/blogs/blog/quick-guide-to-cooking-sous-vide-eggs-with-anova
- Baldwin thermal-time / thickness: https://douglasbaldwin.com/sous-vide.html
- Bon Appétit independent recipe cross-testing: https://www.bonappetit.com/bon-appetit/story/how-we-develop-recipes-bon-appetit-test-kitchen
- FoodSafety.gov internal targets: https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures
