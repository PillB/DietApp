# Independent DietApp release audit — 2026-10-31

**Audit branch:** `audit/recipe-qa-20261031` · **Draft PR:** https://github.com/PillB/DietApp/pull/1

## Evidence, not inference

- Reviewed the deployed app's **previously committed** 19-image walkthrough, the current repository, test source, data manifests and D-series ledger. Do **not** call those images new screenshots of this PR.
- Independent browser access to https://pillb.github.io/DietApp/ is BLOCKED in this environment (`net::ERR_BLOCKED_BY_ADMINISTRATOR`; DNS `EAI_AGAIN`). The PR's CI performs Chromium tests of a locally served **candidate commit**, but does NOT establish the live Pages deployment matches this branch.
- GitHub-hosted CI is the authoritative execution record for this PR; link the exact run SHA, test counts and artifacts. Do not mark unexecuted checks green.
- User-facing "all production perfect / no pending issues" is unsupported while recipe kitchen validation, six-language review and store matching remain open.

## Critical fixes implemented in this PR

| ID | Fault | Root cause | Correction | Evidence gate |
|---|---|---|---|---|
| P0-R1 | Engine routes showed dashboard | `assets/js/app.js:readRoute()` fell through for `shopengine/planner/cookmode/flavoratlas/weighin` | Recognize these five routes; gate `index.html` sections with matching Alpine `x-show` and `x-cloak` | `tests/comprehensive_live.cjs`: actual visibility, URL, viewport and mutually-exclusive panels |
| P0-T1 | Navigation passed without visiting view | `tests/comprehensive_live.cjs` had `if (hasPanel) return 'visible'` | Query actual DOM, reject hidden panels and conflicting engine views | All 13 routes incl. 5 engine routes |
| P0-T2 | Modal close always passed | `check(true, '3-modal-closes')` | Check overlay no longer visible | Modal close falsifiable |
| P0-M1 | Step recipe reconciliation manufactured success | `tests/recipe_correspondence.test.cjs` set all leftover grams to zero whenever ingredient name was mentioned | `assets/js/step-consumption-core.js` uses exact rational per-step amounts and rejects overuse, absent use and wrong basis/unit | `tests/step_consumption.test.cjs` six controls + corrected correspondence negative |
| P0-F1 | Plátano bizcochito pointed to cooked beans | `data/canonical/docx-diet-recipes-canon.v1.json` had `foodCompositionRef: 'beans_cooked'` | Now `null` + explicit variety-not-matched status | Source integrity test |
| P0-F2 | Fish heated with no ingredient trace | `pescado_ajonjoli_diet` heat step had no protein references | Explicit `processRefs: ['filete_pescado_blanco']`; process reference does not add fish a second time | Traceability test |
| P1-U1 | Same Spanish nav label for two different shopping tools | Duplicate `nav.shopping` in `index.html` | New `nav.shopengine` translated to all six locale dictionaries | i18n key and route inventory |
| P1-S1 | 63°C/45min egg called jammy | A texture assertion contradicted directly tested egg outcomes | Text now accurately says soft whites and runny yolks and does not claim pasteurization | Source/served data synchronization + published source |

## Exact mathematics / what the new data does and does NOT prove

The canonical DOCX source contains **4 recipes**, **13 procedural steps** and **22 manifest ingredient lines**. `ingredientUses` allocates each manifest quantity to the first procedural step that uses that ingredient. For a particular ingredient `i`, in consistent dimension, unit and basis:

```
remaining[i,0] = declared[i]
remaining[i,k] = remaining[i,k-1] - plannedUse[i,k]
assert plannedUse[i,k] > 0
assert remaining[i,k] >= 0
assert remaining[i,final] = 0 unless recipe explicitly records leftovers
```

This is a **planned material allocation**, NOT physically weighed ingredient usage, edible yield, transfer loss, evaporation or validated cooked yield. `ingredientUseStatus` and the manifest's validation status say so. Do not promote it to a "weighed" status without measured evidence. An ingredient can be processed in multiple steps, but its original input is allocated once; `processRefs` prevents counting it again when it is cooked.

The 29 legacy recipes remain largely prose ingredient groups; 7 curated variants have weighed-looking *proposed* ingredients but are not independent kitchen measurements. They are separate audit lanes. No mass-conservation certification for these 36 recipes is claimed here.

## Research-based recipe decisions

1. **63°C / 45-minute eggs.** Anova directly tested ~62.8–63°C eggs for 45min and reports runny yolks/barely set whites, not reliably jammy. See https://anovaculinary.com/en-ca/blogs/blog/quick-guide-to-cooking-sous-vide-eggs-with-anova and https://anovaculinary.com/sv-ca/pages/sous-vide-egg-guide.
2. **Risk of lightly cooked eggs.** FoodSafety.gov recommends using pasteurized eggs for raw or lightly cooked preparations; its general safe-temperature chart recommends cooking shell eggs until whites and yolks are firm. See https://www.foodsafety.gov/blog/salmonella-and-eggs and https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures. This is a safety disclosure, not proof of pasteurization.
3. **68°C / 24-hour beef short ribs.** Plausible long-hold starting point, but cut thickness, shape, initial food temperature, bag handling, circulator control and kitchen texture remain unverified. Thomas Keller contrasts other temp/time pairs (62°C/48h and 79°C/24h); Anova has different recipes; do not extrapolate a single universal result. See https://www.masterclass.com/articles/chef-kellers-short-rib-sous-vide-recipe and https://douglasbaldwin.com/sous-vide.html.
4. **Test-kitchen cross-testing.** Bon Appétit requires independent cross-testing by another editor; ATK uses repeated cooking and home tests. Automated code tests alone cannot make a recipe foolproof. See https://www.bonappetit.com/bon-appetit/story/how-we-develop-recipes-bon-appetit-test-kitchen and https://cook.americastestkitchen.com/lp/cielevateskillsv2.

## Next supervisor/developer rounds (blocking)

**Round A — Complete falsifiability and integration:** CI lint, new unit and property tests, privacy gate, production-data sync, Chrome E2E, axe + viewport sweep. Also test direct deep links, back/forward, modal Escape and focus, and hidden-element click rejection.

**Round B — Cooking chemistry / thermodynamics:** each recipe separately: ingredients in base grams, optional quantities, prepared and raw/cooked basis, hydration, yield, pan/hob/oven size, time at heat, correct thermometer probe location, allergen cross-contact, cooled leftovers; sous-vide geometry and pasteurization limits. The owner kitchen worksheet remains a distinct real-world requirement.

**Round C — Shopping correspondence:** for each scheduled plan and serving factor compare exact ingredient-use sum with canonical recipe manifests, residuals, pantry offsets, basis, package units and purchases; keep `needs_package_decision` until retailer pack attributes have URLs and dates.

**Round D — Spanish (Peru) and all six locales:** extract **visible**, not merely mounted, DOM text after opening each view/modal and switching locale. Classify into app chrome, recipe translation, raw citation, unknown ingredient and proper name. Prior sweep `tests/en_text_sweep_after.json` is a *candidate inventory* (it also includes hidden mounted content), not a proof of localization. Validate Spanish quantities, gender agreement, cooking verbs, temperature, decimal separators, raw/cooked basis, safety instructions and shopping commercial names. Do not silently auto-translate critical food safety claims.

**Round E — User journey and adversarial permutations:** enumerate controls (routes, buttons, selects, forms, week changes, repeat rules, language changes); use pairwise combinations and edge cases, not an impossible claim of exhaustive Cartesian combinations. Test zero, fractional, excessive and duplicate servings; dates across month/year leap boundaries; storage reload/offline, malformed inputs, missing nutrition, price/stock unavailability, 320/390/1440 widths. Save screenshots, accessibility reports, network failures and exact deployed SHA.

**Round F — Release and evidence:** reconcile open LEDGER-1c/2/3/5/6/7, close only with specific falsifiable proof and independent review. Mark any third-party service/capacity blocker explicitly; never claim live verified unless Pages exact-commit was loaded successfully and screenshots are fresh.

## Detailed developer instructions

Keep draft PR #1 unmerged until CI passes. When CI fails, read workflow logs, state the root-cause hypothesis, correct the smallest relevant code, and rerun. After a failed fix hypothesis, research comparable failures online before a second attempt; after two distinct failed fixes, stop and publish the diagnostic handover. Do not attempt unavailable tools or repeat quota-blocked calls. Never weaken independent tests to greenlight an erroneous implementation.
