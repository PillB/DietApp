# Recipe design standard (research-sourced, 2026-10-31)

Research sources (retrieved today; LEDGER-1 recovered):
1. **FoodSafety.gov — Safe Minimum Internal Temperature Chart** (foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures; page "Date Last Reviewed November 21, 2024"): poultry 165°F/74°C; ground 160°F/71°C; steaks/roasts/chops 145°F/63°C **+ 3-min rest**; fish 145°F/63°C; leftovers 165°F/74°C; eggs until firm; 2-h refrigeration rule (1 h >32°C).
   → Constants in `assets/js/cooking-core.js` verified EXACTLY against this authoritative source (LEDGER-D6 evidence below).
2. **America's Test Kitchen methodology** (americastestkitchen.com articles: "Five-Recipe Test" 2023-09-20; "How We Make Our Recipes Failproof" 2023-04-04): research first → five-recipe comparative test → development loop → randomized tasting → home-cook testing gate (≥80% make-again) → refine → publish; mise en place treated as a core skill-honesty step ("keeps us honest about the amount of work"); every recipe carries a "why this works".
3. **Mise en place structure** (Iowa State Univ. Extension PDF; NFSMI Culinary Techniques): plan work → collect tools → collect ingredients → prep all → set up station → prioritize after.

## Applied standard in this repo (all changes to recipes MUST satisfy)
- `mise_en_place` per station, BEFORE method steps; es-PE first (owner-locale flow), English parallel.
- Method steps carry a station label, exact ingredients consumed, time, checkpoint, hazards.
- Thermometer checkpoints required for heat-critical protein steps; temps cross-checked vs CookingCore gates (the authoritative constants above).
- Every recipe explains "why this works" once composition/nutrition wiring completes (owner text review).
- Owner weigh-in (P4.4) is the gate for anything shipped as "weighed": docx estimates remain `needsKitchenValidation` (LEDGER-2).
- No names/phones in code or artifacts (owner rule) — "why this works" explanations are content, not attribution.

## ATK-inspired practice now encoded in our workflow
- Red-team lenses ≙ ATK's test-and-critique: our 5 lenses run on EVERY recipe change (tests/recipe_redteam.test.cjs), and the harness itself has seeded negatives proving it can fail.
- The `documented kitchen-test worksheet` (P4.4, pending owner data) mirrors ATK's "home recipe testing" gate: nothing is published as verified without an ≥1 owner cook-through + per-serving weigh-in; make-again feedback becomes a ledger item.
