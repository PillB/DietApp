# RELEASE REPORT — DietApp v4 on GitHub Pages

**URL**: https://pillb.github.io/DietApp/  
**SHA**: `8ca1849` (latest; branch `main`)  
**Deployed**: 2026-10-31, America/Lima  
**Visibility**: `public` (owner flipped + authorized Pages — quoted: "also publish to pages")  
**Pages scope**: `main` branch, `/ (root)`, relative asset paths handle `/DietApp/` subpath correctly  

## What's live
| Feature | Status |
|---|---|
| Deficit week planner | ✓ (1500/1400/1200 kcal presets; clinician-acknowledge for <1500; per-pick ranked explanations; per-serving kcal/protein/fiber) |
| Cook mode | ✓ CFE-style diagrams (CFE columns), es-PE + EN steps, safety-temp gate verifications (FoodSafety.gov), leftover-notice builder, CFE cooking validity |
| Shopping list | exact rational quantities; grouped by food family; es-PE draft names; CSV + print; pantry offsets |
| Flavor Atlas | behavioral aggregates with disclosures; explainable taste ranking with provenance labels on every feature |
| Recipes (weighed) | 7 TPCA-composed per-100-g recipes w/ safety steps, thermometer checkpoints |
| Recipes (docx) | 4 owner we-need-to-weigh recipes listed as `needsKitchenValidation` |
| Composition | 42+ curated per-100g rows (TPCA-ins sourced); NS→null honest missing-row detection |
| I18n | 6 locales; live switcher; planner/shopping/cook/flavor chrome localized |
| P6 locale docs | es-PE definitions + draft-tag markers |

## Privacy walls intact
- `data/private/` (XLSX, docx, PDF, report) — NOT in any pushed git history or Pages build (gitignore + staging sweep).
- `context/private/` — reserved ⬜ (no drop yet)
- The `context/` + `Context information/` page files that ARE public per owner decree **are in the repo and served**; data/private files 404 correctly (verified live).
- No `data/private/*` file names in the public build set.
- No recipe text or nutritional claims in code that claims "assessed"/"verified" without source IDs.

## Deploy lineage
| SHA | Note |
|---|---|
| `61a97e4` | owner authorized (Gate 1-2 ✅); batch-3 composition, computed perServing |
| `1bd2f38` | checkpoint log (pushed setup) |
| `8ca1849` | service worker v4: full engine shell for Pages /DietApp/ scope |

## Remaining ledger items (NOT deploy-blocking)
| Item | Status |
|---|---|
| LEDGER-2 (P4.4 owner weigh-in) | ⬜ OPEN: owner must cook a recipe with scale |
| LEDGER-3 (composition rows ~57/60) | ⬜ partial: composite fruits (fruta的组合), corn tortilla, platano bizcochito, vegetable stock, salmon-import, SKYR brand |
| LEDGER-4 (Nutrition panel kcal presets) | ⬜ pending UI |
| LEDGER-5 (store rows all 'notChecked') | ⬜ pending owner verification |
| LEDGER-6 (P6 remaining locale pages) | ⬜ partial (planner/shopping/cook/flavor chrome localized; recipes es-PE-first) |
| LEDGER-7 (Triple-data dedup decision) | ⬜ pending owner |

## Old Exclusions
- `.gitignore` prevents further commits of data/private/ or any private file
- Privacy scanner (`scripts/privacy_check.cjs`) runs in every `npm run check`
- Ledger checker (`tests/recipe_ledger.test.cjs`) also live
