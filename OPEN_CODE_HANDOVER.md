# OpenCode handover — Personal Gourmet Kitchen / Lima market edition

**Created:** 2026-10-30, America/Lima  
**Status:** Implementation handover + existing v3 baseline; **not a fully built or deployed v4**. The supplied v3 is a prototype with limited QA.  
**Owner intent:** A beautiful, research-grounded Art Nouveau web app with ingredient-accurate shopping and intuitive recipes, optimized for low-cost OpenCode Go model usage.

## 0. A 2-minute starting ritual for the coding agent
1. Read `AGENTS.md`, this handover, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/MODEL_RESEARCH.md`.
2. Execute `python scripts/check_handover.py`, then `node --test tests/nutrition-core.test.cjs` and `git status --short`. Record actual results in `docs/PROGRESS.md`.
3. Inventory `context/` (future user-provided files), `data/private/` (preexisting private originals), `meal-plan-data.json`, `nutrition-reviewed.json`, `assets/js/` and current failures; do not assume the previous report's claims are verified.
4. **Implement P0 first:** privacy leak check, data-contract fixture, test additions. Make a small commit. If no meaningful file change or test result within first few minutes, stop reasoning and produce a diagnostics summary instead of silently spending Go allowance.
5. Verify current `/models` and Go plan allowances, choose Flash by default; escalate only for evidence-backed problems.

## 1. What already exists (facts from the supplied project, not new implementation)
- v3 static SPA: `index.html`, `assets/js/app.js`, `assets/js/data.js`, `nutrition-data.js`, `nutrition-core.js`, `nutrition-ui.js`, `assets/css/tailwind.css`, icons, manifest/service worker.
- Earlier 28 daily menus, **29 legacy recipes**, **seven separate weighed illustrative recipes**. The legacy recipes have NOT undergone full, defensible nutrient or kitchen testing. Some earlier generated content had unsafe/contradictory practices and unverified sugars; do not call these proven compliant.
- Tests: `tests/nutrition-core.test.cjs` and `tests/test_ui_playwright.py`; previous Playwright test used isolated `page.set_content()` on nutrition module only. `tests/QA_REPORT.md` documents this and untested CDN/E2E flows.
- Private source material under `data/private/`: Rappi order workbook (1,340 parsed food-order rows), JAMA commentary PDF, generated long-form report. Private XLSX has dates, prices, descriptions and excerpts. Treat all as **nonpublic**.
- Existing 7-variant nutrition values are generic illustrative estimates; branded food nutrients, actual yields, sodium, added sugar, saturated fat remain unverified.

## 2. Business goals / success metrics
**North-star:** A user can find a tempting meal, trust its cooking directions, put it on several dates, and buy *precisely the right ingredients* in Lima without redoing arithmetic.

User jobs: (a) understand 'why these dishes suit me' with honest confidence measures; (b) select/filter/compare recipes including Instant Pot, stovetop and oven; (c) plan breakfast/lunch/dinner/snacks across arbitrary dates and repeat by selected weekday/week; (d) run hands-free step-by-step cook mode with timers, equipment checks, safety prompts; (e) build a unified shopping list for coming week (default), arbitrary range or multiple weeks; (f) shop familiar Peru storefront names + presentations, with alternatives and out-of-stock uncertainty; (g) preserve flavor and satisfy dietary preferences without fake nutrition certificates.

**Measurable release gates:** 100% normalized ingredients for published scheduled recipes; 0 unknown units silently merged; 0 provenance-free "in stock" claims; 100% translation of user-facing controls in six target locales; 100% safety-critical recipes have reviewer approval; zero blocking a11y errors; correct shopping math for fractional quantities, unit conversions, portion scaling, repeated recipes and date range; browser E2E tested on true served site with real assets/CDNs; print works; no private data in Pages artifacts.

## 3. In-scope product design
Navigation: `Discover/Flavor Atlas`, `Recipes`, `Calendar`, `Cook`, `Shopping`, `Nutrition & Portions`, `Sources & Help`, `Settings`. Search by ingredient, cuisine, flavor dimension, texture, time, equipment, meal type, verified/not verified, and available store equivalence. An explicit cooking-mode badge differentiates truly pressure-tested Instant Pot directions from generic stove directions. Avoid auto-generating Instant Pot times from stovetop times.

UX patterns: recipe cards with original name + es-PE local name + verified provenance; a visually rich semantic map but also keyboard-accessible text list; day/week/month planner; modal/side panel for assign/repeat/portion counts; draggable planning optional (keyboard alternative mandatory); cooking stepper with progress, ingredient cross-references, time, sensory stop condition, thermometer target, timer controls, notes; stable shopping checklist with grouping and print/copy/CSV; shopping sheet indicates `required → package recommendation`, e.g. `2.5 onions → purchase 3 whole onions` without falsifying availability.

## 4. Evidence and food-science baseline
- Diet PDF: Mozaffarian JAMA *Perspective* (2026), **not a personal clinical prescription**, not a validated basis for claiming every recipe meets intake needs. Reuse notes but independently verify with primary dietary authorities and audited nutrient composition. Avoid misclassifying honey as exempt from added/free sugars.
- Food nutrient sources: Peruvian Instituto Nacional de Salud TPCA (2023 edition and online tables), USDA FoodData Central for missing foods, brand labels for packaged items. Match edible/raw/cooked basis, no conflation of g and servings, record per-100g energy/protein/fat/carbs/fiber/sodium/sat fat/added sugar where available; missing must remain `null`.
- Safety: FoodSafety.gov minimum internal temperatures (poultry 74°C; ground meat 71°C; fish 63°C; leftovers 74°C), USDA cooked leftovers 3–4 days at refrigeration <=4°C; recipes require cross-contamination and allergen markers. For Instant Pot, safety-specific liquid, release, fill line, trivet, pressure model and altitude caveats; no claims that acid 'cooks' pathogens away.
- Meal preferences: order frequency is **behavioral evidence only**; infer texture/creaminess/umami with uncertainty and separate purchase-category noise, duplicates and guessed descriptions. Order frequency alone cannot establish personal heat tolerance.

## 5. Source/data contract and provenance
`context/` will be populated by user before OpenCode begins; do **not** invent filenames or skip its audit. `context/README.md` describes ingestion, priority, conflicts and privacy. Original private workbook has Food_Orders plus auxiliary sheets; do not dump it wholesale into client bundle. Original 29 recipes have uncontrolled prose ingredients: **quarantine shopping math for them until human-reviewed normalization**. Seven weighed variants can be first test fixtures after checking units, optional, raw/cooked basis, and yield. Keep editable normalized data separate from raw originals.

Suggested normalized structures and tests in `docs/DATA_CONTRACT.md`. Never equate original full-recipe strings to individual ingredient records. Version schemas and make migrations reversible.

## 6. Commerce integration for Lima
Local shopping names have real variants: `cebolla roja`, `cebolla blanca`, `cebolla china`; `ají amarillo` paste/fresh; `quinua` dry/cooked; `queso fresco` specific brands. Aliases are for matching ONLY; they are not substitutes unless user-approved. Stores priority Wong, Plaza Vea, Metro, plus optional verified Mercado/Puntomercado alternatives. Search catalogs/manual import by store; never claim inventory without store, location, timestamp, SKU and evidence. No bypass of login/CAPTCHA or TOS. Static offline app can support export/cart links, but **cannot reliably provide live store inventory without a backend or authenticated integration**. See `docs/RETAIL_MATCHING.md`.

## 7. Architecture decision
Preserve accessible static HTML/CSS/JS app for easy GitHub Pages deployment; convert to modular, testable services (`catalog`, `ingredients`, `portionMath`, `planner`, `shopping`, `nutrition`, `i18n`, `flavor`, `storage`, `storeMatches`) with **pure functions for all calculations**. Browser state `IndexedDB` or localStorage (versioned, export/import, error handling); static public assets only. Tailwind Play CDN is not an ideal final production dependency; ship compiled CSS (dev build allowed) or use locally shipped hand-authored design tokens. User can still run production as static files without installing Node. Avoid putting Node, API credentials or user data into public client JS.

## 8. PILLB Solarize handling
No original `pillb solarize` skill file or installation was available in this session, and public searches did not establish a trustworthy official definition. An interim *original* style adapter is included at `.opencode/skills/solarize-fallback/SKILL.md`, explicitly not represented as authentic. When the user supplies real PILLB Solarize skill in context, OpenCode must read it and replace relevant aesthetic choices only after comparing accessibility and maintainability. The interim follows Art Nouveau + solarized paper/teal/amber design direction documented in `docs/UX_DESIGN_SYSTEM.md`.

## 9. Six supported languages
English (`en`), Peruvian Spanish (`es-PE`), Mandarin Simplified (`zh-Hans`), Hindi (`hi`), German (`de`), Japanese (`ja`), selected to cover two major internet-language populations and two affluent online markets beyond EN/ES. Translate *every* visible action, label, empty state, safety warning, week/month/number, units, accessible label, tour step, error, print header, and ingredient-store distinction. Recipes may have source-language names but must show a translated summary or explicit source-language notice. Don't fake native fluency or auto-translate safety critical directions without reviewer QA. Full locale plan in `docs/UX_DESIGN_SYSTEM.md`.

## 10. Development and handoff cadence
Read `docs/IMPLEMENTATION_ROADMAP.md` for phases P0–P8 with atomic tickets. All changes require evidence, unit tests, E2E or screenshots, docs and a runnable next session. Model policy `docs/MODEL_RESEARCH.md`, safety `docs/FOOD_SCIENCE_VALIDATION.md`, retail `docs/RETAIL_MATCHING.md`, testing `docs/QA_RELEASE.md`. Record last checkpoint and next command in `docs/PROGRESS.md`. Never perform uncontrolled autonomous hours-long work on Kimi K3; cap cycles, log usage, switch model only when bottleneck evidence supports it.

## 11. Publish gate
No public deployment until the user chooses a GitHub repository/organization and explicitly authorizes push and GitHub Pages publication. Remove private raw files from **git history**, not just the working tree, if accidentally committed. Run source leak scan against staged assets. Public Pages cannot serve private order details safely. No invented active storefront integration. If consent missing, produce build artifact + publish checklist.

## 12. What 'done' actually means
A new user, not the author, can open a GitHub Pages HTTPS URL, browse verified recipes in EN/ES/ZH/HI/DE/JA, repeat a recipe twice in a chosen week with portion counts, generate the correct combined week shopping quantities, select Wong/Plaza Vea/Metro product matches with availability provenance or clearly unverified state, follow a safe cooking-mode flow, export/print, reload without losing state, and view the flavor report without revealing their raw order history. Tests and evidence are reproducible by a third party.
