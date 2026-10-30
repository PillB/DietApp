# AGENT.md — Nutritionally Audited Gourmet Planner

## Mission
Continue developing a zero-build, premium, Art Nouveau-inspired food-planning app grounded in genuine order-history preferences and verifiable nutrition science. Every claim must have an evidence provenance; no source-derived quantity may be silently invented. Preserve the 29 full original recipes while distinguishing them from 7 new *weighed variants*.

## Mandatory source hierarchy
1. **PDF** `data/private/dariush-mozaffarian-the-2025-2030-dietary-guidelines.pdf` (JAMA perspective, not personal prescription). Cite precisely; discuss controversial protein guideline explicitly.
2. **User's food orders** (`data/private/food_delivery_orders_extracted(2).xlsx`) if locally available. This is private purchase history; do not publish.
3. **Original meal-plan corpus** `meal-plan-data.json` (29 recipes/28 menus); audit claims rather than adopting prior `Compliant after revision` status as verified nutrition.
4. Public authoritative science: NIDDK, CDC, WHO, USDA/FDC, original trials/meta-analyses; preserve links and retrieval date in `NUTRITION_RESEARCH.md`.

## Requirements
- Web: static HTML + Tailwind CDN + Alpine CDN + plain JavaScript; no Node build or server required for users.
- Nutrition: blank-input adult energy estimator with transparency, configurable protein reference mass, safeguards, ±error qualification and avoidance of punitive/very-low-energy defaults.
- Recipes: retain original 29, plus an explicitly separate validated-weights recipe set. Do not certify nutrient macros without reliable food composition references and complete recipe yields.
- Shopping: use numeric ingredients; aggregate by canonical ID **and unit**, scale scheduled individual portions by recipe yield; support date range and 4-week repeats. Never string-count unstructured ingredients as nutritional amounts.
- Flavor and diversity: preserve richly flavored proteins, pasta/rice, herbs, ají, seafood, cheese, creamy/crispy textures. No default low-carb or low-fat replacements.
- Documentation: state what was tested, what remains unknown, and how to reproduce audit, model and UI checks. Mark privacy-sensitive files ignored by git.
- Accessibility: proper labels; keyboard-visible focus; text wrap on 320px; print; localization; usable with screen reader. Responsive checks at desktop, tablet, phone.

## Phases with prospective checkpoints
1. **Data audit**: compare PDF, original 29 recipes, composition fields; list missing evidence. Check no false certification. Deliver `NUTRITION_RESEARCH.md`, `nutrition-reviewed.json`.
2. **Nutrition model**: implement pure functions for dates, estimated energy, protein range, recipe nutrient arithmetic and unit-safe shopping aggregation. Check invalid inputs, rounding, fractional ingredients, servings/repetition.
3. **Recipe/data layer**: weigh ingredients in 7 curated recipes and mark raw/dry/cooked. Don't copy nutrient precision beyond reference data. Calculate generic approximate per-serving values and warning labels.
4. **UX/Art Nouveau UI**: responsive nutrition section; upcoming-week starter, date-range shopping, optional weekly repeat; try Spanish and English, check all controls. Original corpus remains navigable.
5. **Testing round 1**: Node built-in unit/regression tests; Playwright desktop and phone; navigation, form safeguards, recipe display, shopping, date range and 2.5 onion test; document defects.
6. **Testing round 2**: rerun after fixes; check overflow geometry, contrast, clickability, kitchen steps, accessibility, logs. Record outcomes, avoid unverifiable claims.
7. **Packaging**: ZIP complete project + docs + source data private, `.gitignore`; never push purchase records to a public repository. Publishing to GitHub requires the user's repository/authorization.

## Pending release blockers (must not misrepresent)
- Recipe macros are illustrative, not lab/canonical FDC ID audited; sodium/saturated-fat/added-sugar values unverified.
- 29 historical full recipes are not nutrient-certified.
- EN/ES implemented for new module; expand source UI 6-language translations after expert review.
- Clinical suitability requires actual user intake/activity and potentially a clinician; no silent extrapolation from older weight records.
