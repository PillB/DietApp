# DietApp — independent live/CI diagnosis and release handover (2026-10-31)

**Work branch:** `audit/main-live-fixes-20261031`  
**PR:** https://github.com/PillB/DietApp/pull/2 (draft, safety gate: do not merge without actual candidate CI)  
**Initial baseline:** `main` commit `faaf0b7e347b56147fb1a3623f2cbc2578ae47ad`. **Important:** `main` continued to move during this audit; compare before merging.  
**Production:** https://pillb.github.io/DietApp/

## 1. Root-cause findings (verified against current-main SOURCE, not inferred from screenshots)

### P0-ROUTE: selected navigation links open the dashboard, not selected content
- In `assets/js/app.js`, `readRoute()` recognized only dashboard/calendar/recipes/knowledge/compliance/nutrition plus week/day/shopping. It omitted `shopengine`, `planner`, `cookmode`, `flavoratlas`, `weighin`.
- The five `index.html` sections existed but lacked `x-show` and `x-cloak`; the router fell back to `dashboard` and the engine sections appeared below or not in the selected viewport.
- Repair: all five routes are included, only selected panel is visible, mobile menu collapses on selection, and nav is responsive.
- **Falsifiable proof:** `tests/candidate_route_audit.cjs`: for each 13 routes × 2 viewports, assert selected panel visible and intersects viewport, exact URL hash, zero other visible engine sections; archive screenshots per route.

### P1-ESPE: dynamic shopping output in English while chrome is Spanish-first
- `assets/js/shopping-ui.js` emitted literal English strings `need`, `buy`, `package decision pending`, `pantry covers`, `Engine ready`, no warnings, clipboard feedback and a store fixture banner. Distinct shopping engines also had duplicate sidebar labels.
- Repair: localize those dynamic strings using `assets/js/i18n.js` keys in all 6 locale dictionaries. Preserve the current main's valid-date-range guard and existing interpolated `shopping.added` Spanish status.
- **Falsifiable proof:** candidate browser must generate shopping quantities and reject the old English fragments. An actual proof must verify visible DOM after choosing a recipe and date, not merely assert dictionary keys.

### P0-NUTRIENT: plátano bizcochito mapped to cooked beans
- `data/canonical/docx-diet-recipes-canon.v1.json`: `platano_bizcochito.foodCompositionRef` was `beans_cooked`. This is a scientifically invalid source identity.
- Repair: clear the reference and mark it unmatched until the exact fruit/cultivar reference or commercial nutritional label is reviewed.
- `assets/js/composition-bridge.js` already treats this variety as an unmatched `NS` case; this repair prevents schema consumers from making the wrong substitution.
- **Falsifiable proof:** `tests/food_release_control.test.cjs`.

### P0-EGG: inaccurate 63°C for 45-minute egg texture and pasteurization implication
- Main's `meal-plan-data.json` and served `assets/js/data.js` previously described 63°C/45min as reliably jammy/custardy, inconsistent with Anova's directly published tests.
- Repair: barely-set whites and runny yolk; distinguish visual doneness from microbial safety. Lightly cooked eggs call for pasteurized eggs or an applicable verified safety process.
- **Falsifiable proof:** test source/served parity and no false jammy claim. A code test CANNOT prove egg pasteurization or sensory reproducibility.
- References: https://anovaculinary.com/en-ca/blogs/blog/quick-guide-to-cooking-sous-vide-eggs-with-anova and https://anovaculinary.com/es/pages/sous-vide-egg-guide and https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures .

### P0-STEP: old 'used/remaining' test never decremented remaining
- `tests/recipe_used_remaining.test.cjs` previously initialized remaining to the declared total and asserted it nonnegative without subtracting steps; this **cannot** prove material conservation.
- Repair: `assets/js/step-consumption-core.js` implements exact rational planned allocation and fails on overconsumption, wrong basis/unit and unallocated inputs. Four DOCX canonical recipes now hold 22 planned first-use allocations across 13 steps; fish heating step records a process reference to the previously allocated protein.
- **Not kitchen measured:** the values were allocated FROM declarations, not observed during cooking. `planned-unverified-awaiting-kitchen-cookthrough` prevents a false validation claim.
- Additional gap: the seven curated recipes have descriptive step claims; the 29 legacy recipes use prose ingredients. Do not claim all recipes quantitatively reconciled; separately canonicalize each of the 36 first.
- **Falsifiable proof:** `tests/step_consumption.test.cjs` with seeded overconsumption, unallocated amount and wrong unit tests.

### P0-CI: successful deployment is independent of quality
- Production `main` had Pages `build/deploy/report` jobs passing while route, dynamic shopper and nutrient-reference defects remained.
- New workflow `.github/workflows/pr-quality.yml`: independent lint/unit/property/privacy/source-sync, real Chromium served interactions, 13×2 route screenshots, full responsive/axe staging; separate nonblocking live-main baseline screenshot job. The baseline's job success is not a PASS verdict when its walkthrough reports failed assertions.
- CI exposed an existing lint failure: an overly complex test callback and unused variable in `tests/recipe_used_remaining.test.cjs`. Split checks into independent batch and 1-serving helpers WITHOUT suppressing lint and without deleting the identity assertions.
- Gitignored owner originals are intentionally absent from GitHub-hosted CI. `tests/source_inventory.test.cjs` and `scripts/check_handover.py` distinguish unavailable SHA checks from actual validation and ensure private originals aren't Git-tracked.
- **Never claim** the live version matches the PR commit until Pages is rebuilt AFTER merge and served resources' commit identity is verified.

## 2. Mathematically testable shopping contract

For ingredient key = (canonical id, physical dimension, measured basis, unit), intended use at step k must satisfy:
```
R(i,0) = Declared(i)
R(i,k) = R(i,k-1) - Use(i,k)
for all k: 0 <= Use(i,k) <= R(i,k-1)
final R = 0 OR an explicit measured unused/optional remainder
Demand(i) = SUM(plan entry portion / canonical base servings × declared(i))
NetDemand(i) = max(0, Demand(i) - pantry usable(i))
Packages(i) = ceil(NetDemand(i) / verified package net quantity(i))
```
Never add raw and cooked weights without a validated yield factor. Never merge grams and ml without a documented density. A step that *processes already allocated* fish is not a second purchase of the fish. All arithmetic and round-up rules need seeded negative controls.

The tests can verify a **manifest allocation model** and total purchasing math, NOT the amounts that a human actually measured, discarded, evaporated or cooked. Physical cook-through evidence and two independent editorial reviews remain mandatory for publication-quality labels.

## 3. Recipe science, source inventory and research

The 29 legacy recipes are inventoried individually in `docs/RECIPE_VALIDATION_MATRIX_2026-10-31.md` with prioritized culinary risks. Seven weighed illustrative variants are not equivalent to measured finished yields. Four owner DOCX recipes are marked reviewPending.

Research: Bon Appétit details independent developer/editor cross-testing and repeated written-method cooking: https://www.bonappetit.com/bon-appetit/story/how-we-develop-recipes-bon-appetit-test-kitchen . Douglas Baldwin emphasizes **food thickness and cooking duration** as independent variables for sous-vide heating and pathogen reduction: https://douglasbaldwin.com/sous-vide.html . Keller's 62°C/48h and 79°C/24h short-rib examples show that texture at different time/temperature combinations is not interchangeable: https://www.masterclass.com/articles/chef-kellers-short-rib-sous-vide-recipe . Therefore the current 68°C/24h short ribs should be **kitchen-validation pending**, not labelled scientifically certified.

For each recipe: validate exact raw/dry basis, ingredients by mass, mise-en-place order, temperatures and thermometer probe placement, thickness, equipment size, time at temperature, allergen status, liquid loss, measured edible yield, leftovers storage and independent repeatability. Preserve source language and author intent; use independent cross-tests rather than optimistic automated confirmations.

## 4. Evidence-first supervisor release protocol

1. Freeze PR head SHA and compare against current `main`; reconcile overlapping files, especially `index.html`, `assets/js/i18n.js`, `assets/js/shopping-ui.js`, `docs/ISSUES_LEDGER.md`. No blind merge from older PR #1.
2. Run CI until zero actual blocking failures. Do not weaken rules or label fixtures as real market verification.
3. Parse `tests/candidate_route_audit_report.json`; check all 26 route screenshots, UI controls and Spanish shopping interactions. Explain every failure with exact code line or selector.
4. Run accessibility and geometry checks at 320, 375, 390, 768, 1024, 1366 and 1440; assert keyboard focus, click-hit testing, modal close/Escape and hidden-panel exclusion.
5. Walk all controls and options with bounded pairwise and boundary cases; report attempted count and combinations not executed. Audit each visible text node, locale and data-vs-chrome classification; do not say six languages are fully reviewed on dictionary completeness alone.
6. For any proposed fix, reproduce RED, patch minimal source, run GREEN including actual Chromium, check against ledger regression, and cite scientific primary sources for culinary claims.
7. Two independent failed hypotheses → stop and request supervisor/independent reviewer diagnosis, root cause hypotheses, dead ends and evidence summary.
8. After owner approval and merge: verify Pages deployment job, retrieve exact SHA, navigate the **live** page with Playwright, capture new shots in es-PE, verify every route and newly merged feature. Preserve both previous and fresh snapshots for visual diff; avoid comparing an old published build to a new local candidate as though both were production.
9. Close ledger items only when the promised exact proof exists and has passed in the corresponding environment. Keep real supermarket stock, full translations, 36 unmeasured recipes and physical safety trials OPEN.

## 5. Remaining blockers
- Full step-mass kitchen validation: not done (4 planned / 36 not fully canonicalized).
- All visible English content in legacy sources: not natively translated; draft and disclosure required.
- Actual retail stock/prices/packs for Lima supermarkets: not externally verified.
- Exact production version of current PR: not deployed until merge.
- Negative space: not all interaction permutations can be tested exhaustively; use a documented covering array.
