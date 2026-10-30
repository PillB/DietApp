# Implementation roadmap: bounded, test-first vertical slices

**Operating premise:** a plan is not implemented software. Existing v3 is a starting point only. Every ticket below needs a code diff, tests and checkpoint log. The five/six research-and-improvement iterations are **distinct** from the three test/review loops; no invented test results.

## Research → design feedback loops (six rounds)
1. **Data and provenance discovery:** Inventory all XLSX/PDF/MD/JSON/context; compare counts, duplicate and missing values, ingredient string coverage, private fields. Decision log and trusted schema.
2. **Competitor feature analysis:** official Paprika, Mela, AnyList, Plan to Eat, Mealime and Crouton features; rank against user tasks. Build two click-through flows: plan→shop and find→cook. Do not imitate copyrighted designs verbatim.
3. **Behavioral/flavor science:** analyze category/time/order count, item repeats, text confidence, cuisine/texture nodes. Cross-reference food sensory science and HCI methods. Prefer reproducible heuristics and clearly labeled inference, not unsupported numerical affinity. Invite human corrections.
4. **Nutrition/food safety:** compare PDF commentary with INS TPCA, USDA FDC, current food-safety recommendations; ingredient nutrient basis and per-step review with hazards.
5. **Lima retail operations:** verified store listings, packaging, seasonal/out-of-stock substitutes, urban delivery fees and variation by district, presentation nomenclature; fit UX to shopper workflow and returns.
6. **Information architecture and usability:** mobile first, bilingual/6-locale QA, kitchen-glove interaction, art nouveau contrast/typography, offline behavior, accessibility, shipping checklist. Evaluate prototypes with 5–8 realistic tasks and make revisions.

## Phase P0 — Source and privacy quarantine (first meaningful OpenCode task)
Tickets:
- P0.1 verify `.gitignore`, git staging (`git ls-files data/private context/private`), open source public build and make `scripts/privacy-check` fail if raw data/quoted emails/csv purchase history are present.
- P0.2 `context/` inventory with SHA-256, media type, confidentiality, authority, current status and provenance; store audit in `docs/SOURCE_INVENTORY.md` without sensitive content.
- P0.3 baseline tests, `npm` optional dependencies, CDN failures and service-worker cache; reproduce actual site with `python -m http.server 8000` and Playwright; capture failures, not false passes.
Acceptance: no personal data included in distributable assets; no source details invented; tests reproducibly run.

## Phase P1 — Canonical food data model (highest risk)
Tickets:
- P1.1 implement `Ingredient`, `IngredientUse`, `Recipe`, `RecipeVersion`, `PlanEntry`, `StoreProduct`, `StoreMatch` and `Evidence` schemas. See `docs/DATA_CONTRACT.md`.
- P1.2 add normalization importer from seven weighed recipes; legacy 29 prose recipes marked `needs_normalization`, not added to aggregated shopping until validated. Never silently decompose composite prose in production.
- P1.3 canonical units `g`, `ml`, `count` with exact rational parser (1/2, 2 1/2, ⅓), unit conversion same dimension, raw/cooked flags, edible portion factor only with source.
- P1.4 error report for `ingredient missing`, ambiguous `one medium onion`, `optional`, `sauce as per Station A`, impossible yield, duplicate keys, unknown units, list may be incomplete.
Acceptance: verified sample fixtures round-trip JSON, error messages actionable, raw/cooked distinct.

## Phase P2 — Calendar and meal planning
Tickets:
- P2.1 real date (local date string no UTC rollover), month/week/day views, arbitrary periods, assignment to meal slot, serving count per occurrence, move/copy/delete.
- P2.2 repeat by weekday for N weeks and date-specific exceptions; concurrent same recipe twice in a day permitted and correctly counted.
- P2.3 persistence (IndexedDB or localStorage with versioned migrations, export/import, checksum, conflict handling, privacy help) and shareable nonsensitive planning snapshot.
- P2.4 'upcoming week' means the next Monday–Sunday in America/Lima; disclose whether week containing today or *next* week; allow user preference.
Acceptance: user can schedule same recipe 2 dates 5 weeks apart, recover across reload, range selection exact inclusive days; timezone tests.

## Phase P3 — Shopping aggregation, pantry and Lima SKU match
Tickets:
- P3.1 pure function aggregates only planned occurrences in selected inclusive date range with `servingsRequested / baseYield` and canonical units; optional exclusions, substitutes, manual corrections and fractional quantity formats.
- P3.2 shopping UI groups category, canonical item, total need vs pantry available vs net buy, checked state, meal provenance, partial packages and rounding. No duplicated half-onion as a separate purchase.
- P3.3 real SKU adapter data fixture: `Wong`, `Plaza Vea`, `Metro` names, brand, grams/ml/count, URL, unit price, match rank, observation timestamp, district, delivery eligibility; unverified stock must say `not checked`.
- P3.4 purchase optimization minimizes packages/estimated spend subject to allowed substitutions, product availability, pack sizes, spoilage; expose alternatives; avoid automatic retailer checkout without permission.
- P3.5 copy as shopper-friendly es-PE grouped bullets with serving range, total quantity and store names; print and CSV.
Acceptance: `(1/2 cebolla + 2 cebollas) = 2.5 cebollas` required; purchase 3 whole onions if sold by piece. `500g+0.75kg=1250g`. `500ml+0.5L=1000ml`. Never combine cups and grams without vetted density. 4-serving recipe scheduled for 2 people contributes 0.5x recipe quantities. Multiple dates sum correctly. Unknown quantities labeled and not automatically merchandised.

## Phase P4 — Guided recipe with food-science double-review
Tickets:
- P4.1 recipe summary, pantry checklist, equipment, prep 'mise en place', active vs passive pressure/release times, separate step cards with step number, ingredients used, timer, sensory cue, photo optional, VoiceOver keyboard controls.
- P4.2 Instant Pot validated timing: specify model, pot volume, min liquid, max fill, seal/release, heat-up, pressure-time, natural release, safety warnings and at least one validated source or kitchen experiment. NEVER adapt 4h stovetop braise automatically as 30min pressure.
- P4.3 safety scientist gate stepwise: temps, hazards and allergens, exact time/temp, refrigeration, 3–4d cooked leftovers, freeze notes, reheat to 74°C. Separate nutritional analysis from food safety.
- P4.4 test cook with actual weighing and yield, measure ±g, tastings and consensus notes; generate 'needs kitchen validation' until performed.
- P4.5 nutrition controls user-selectable with no default individualized weight loss prescription. Ingredient/label provenance, energy/protein/fiber etc, uncertainty; use INS for Peru and FDC as fallback.
Acceptance: every published fully verified recipe has structured ingredients, named reviewer/checklist, stepwise validation, objective readiness and safe storage advice.

## Phase P5 — Interactive flavor atlas and recommendations
Tickets:
- P5.1 reorder raw orders and categories with confidence; compute date-binned counts, frequency normalized by categories, recency if appropriate, split grocery and restaurant food. No conflation description-generated text and personally expressed preference.
- P5.2 semantic graph nodes Cuisine, Ingredient, Texture, Taste, Technique, Dish; weighted inferred edges with *why* provenance and uncertainty. Avoid generative hallucinations and causal inference.
- P5.3 D3 SVG optional or vanilla SVG, tooltip, zoom/pan, accessible table alternative, search, filters, evidence inspector; always user correction to 'I don't like this'.
- P5.4 rank recipes using explainable features: affinity (order evidence) + novelty + nutrition fit (only if validated) + equipment + feasibility/store coverage. Clearly label heuristic.
Acceptance: clicking 'creamy + crunchy' surfaces evidence and matching recipes; data export redacted; all charts accessible.

## Phase P6 — Language and polish
Tickets:
- P6.1 six locales EN, es-PE, zh-Hans, hi, de, ja; ICU-style date formatting with Intl; localized decimals, plural portions, allergens, units, ingredient vs store nomenclature; native review of food-safety warnings.
- P6.2 user documentation: searchable help, first-time tour, 'why this recipe?', keyboard shortcuts and 1-minute shopping tutorial in all six languages.
- P6.3 art nouveau / interim solarize token system, accessible contrast, no squashed sidebar or invisible menus, mobile swipe optional with keyboard alternatives.
Acceptance: no untranslated buttons/empty states/warnings across all flows; 320px viewport no horizontal scroll or clipped dialogs.

## Phase P7 — Test and iterative review (three rounds)
1. **R1 pure engine unit/fuzz/property tests**: fraction, conversions, 28/29/30/31 dates incl leap/year rollover, DST even though Lima has no DST, cancel/duplicate, ingredients and pantry, negative/NaN, unknown and optional, store packaging.
2. **R2 Playwright true integration + visual geometry**: 6 locales × 320/375/390/768/1024/1366/1440 × light/dark/print; click all nav and actions; inspect bounding boxes `x,y,width,height,center`, overlapping fixed layers; record screenshots and defects; keyboard and axe accessibility.
3. **R3 release regression**: served production build from HTTPS staging, offline/service-worker behavior, security/privacy/console/link checks, re-run R1/R2; resolve defects; require separate independent food safety approval.
Acceptance: all gating tests green with reproducible commands, explicit evidence; no claims based only on an isolated `page.set_content` mock.

## Phase P8 — Deploy after approval
- Explicit repo URL/account and authorization before `git push` or Pages enable.
- Ensure build output excludes `data/private/`, `context/private/`, API keys and user orders; inspect git history.
- GitHub Pages static site from root or docs/; verify subpath asset URLs, refresh navigation, cache version, mobile; paste final URL and commit hash into release report.

## Atomic next prompts
Start with **P0.1 only**, then P0.2, P0.3. Never issue all P0–P8 as one autonomous request. Example:

> Implement P0.1 in this repo. Read AGENTS.md and OPEN_CODE_HANDOVER.md. Write a failing privacy test, add a safe public build inventory and fix it until green. Show `git diff --stat`, commands run, result and exact one follow-up ticket. Do not alter recipes or design. Stop if no meaningful edit by 90s.

Then each turn: 'Continue P1.1, one vertical slice, tests first, commit after passing and update PROGRESS.md'.
