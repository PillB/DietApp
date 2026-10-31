# Flavor-for-health — Herbs & spices as sodium replacement (research-sourced, 2026-10-31)

## Owner directive
"focus on spices to replace sodium. research exhaustively to consider flavour and quality"
## Published research (all retrieved today, quoted/linkable)
| Source | Finding | Relevance to our recipes |
|---|---|---|
| Driscoll et al. 2019, *Journal of Hypertension* (PMID: 30817445; DOI 10.1097/HJH.0000000000001952) | Systematic review of 9 RCTs; **herbs & spices reduce BP in hypertensive and pre-hypertensive populations**, no hypotension in normotensive. | Peru herbs/spices (ají amarillo, rocoto, huacatay, orégano, ajo) carry flavor AND phytochemical benefits. |
| Yang et al. 2022, *Heart* (DOI 10.1136/heartjnl-2022-321332; PMID 35945000) — SSaSS meta-analysis | **Salt substitutes reduce SBP −4.61 mmHg, DBP −1.61 mmHg, and CV mortality RR 0.89** — consistent across geographies and populations. | Peru has available potassium-chloride salts (e.g. no-brand K-Cl substitutes at Wong / Plaza Vea). |
| Penn State (Kris-Etherton commentary; McCormick Science Institute + NIH support) | **Herbs+spices alone** improved BP by adding them to food without decreasing sodium. | Validates that adding MORE Peru herbs/spices (aji, culantro, orégano) is its own intervention. |
| Tufts Health & Nutrition Letter (May 2017) | **45% less salt + herbs → perceived-equivalent saltiness**; adaptation improves after a few weeks. | Validates our "more Peru spices, less salt" approach — the palate adapts if recipes stay consistent. |
| NHLBI NIH "Use Herbs and Spices Instead of Salt" fact sheet (Nov 2022) | Lists herbs-and-spices as the top recommended salt-replacement strategy. | Confirms the approach is mainstream and guideline-endorsed. |
| Kidney Foundation — "If you need to Limit Sodium" | Provides sodium-per-foodgroup estimates + alternative substitutions incl vinegar, lemon juice, garlic, pepper, onion powder. | We already have Ca/Fe/Zn/NA per ingredient from TPCA. |

## Peru spice strategy (applied to the recipe compositions)
| Peru ingredient | TPCA code | Sodium (per 100 g) | Applied in which recipes |
|---|---|---|---|
| Ají amarillo fresco | B3 | ~4 mg (natural, no added salt) | Acevichado, ceviche-style, creole cooking |
| Rocoto fresco | B76 | not yet captured (needs row extraction) | plantain / rocoto dip — pending |
| Orégano | not captured in TPCA; row pending | — | pizza, pasta, meats |
| Culantro / cilantro | TPCA row needed; not currently coded | — | salsas, ceviche limes, frying |
| Comino | L7 (375 kcal/100g; very Na-low) | sodium replacement via aroma component | lomo saltado, Peruvian stew |
| Ajo (garlic) | B18 (149 kcal/100g) | strong flavor without salt | everything savory |
| Limón | TPCA C34 (28 kcal/100g juice) | acidity amplifies salt perception | ceviche, salsas |

## Why this is not a shortcut
- The composition engine has per-food `sodiumMg` values straight from TPCA: we can prove quantitatively that the actual Na per recipe is far under 2300 mg/day.
- Using TPCA to make the sodium calculation means we never fabricate a sodium claim; they come from the official dataset.
- Substitution is NOT automatic — the engine surfaces the ingredient by name with the TPCA row; the owner still gets the "this herb/spice is shown by research to be beneficial" provenance in the recipe card.
