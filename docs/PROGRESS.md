# Development checkpoint — updated by each OpenCode turn

**2026-10-30 handover generated**
- Existing v3 baseline included from prior ChatGPT output, with original files unchanged.
- Research and implementation plan added: AGENTS.md, OPEN_CODE_HANDOVER.md, docs, Solarize **fallback** skill, OpenCode commands, testing scripts.
- Deployment **NOT performed**. Full website/food scientist reviews **NOT performed** in this handover.
- Next atomic coding task: **P0.1** (`docs/IMPLEMENTATION_ROADMAP.md`) with privacy test, public asset audit and actual served browser baseline; do NOT start with redesign.

| Ticket | Status | Evidence | Next action |
|---|---|---|---|
| P0.1 privacy scan | **done 2026-10-30 (session 1)** | `scripts/privacy_check.cjs` + `tests/privacy.test.cjs` (15/15 pass); CLI exit 0; 2 real leaks found & redacted in served assets; `.gitignore` created; repo initialized | — |
| P0.2 source inventory | **done 2026-10-30 (session 1)** | `scripts/inventory_sources.py` → `docs/source-inventory.json` (83 artifacts hashed); `tests/source_inventory.test.cjs` seeded-negative proof; findings in `docs/SOURCE_INVENTORY.md` | Ask user: deduplicate the twice-stored context drop (keep one copy?) |
| P0.3 served E2E baseline | **done 2026-10-30 (session 2)** | `tests/e2e_served.cjs` + Playwright chromium: real served site, 8 nav links, Alpine mounts, 0 pageerrors, 0 local asset failures, no 390px overflow, private-path guard 403 ✔; screenshots `tests/e2e_served_*.png`; report `tests/e2e_served_report.json` | — |
| P1/P2/P3/P4/P5/P6/P7/P8 | pending | roadmap | Must execute sequentially |

## Session log — 2026-10-30, session 1 (P0.1)

Time (Lima): morning. Model: glm-5.3-flash (OpenCode Go).
Task: P0.1 privacy leak check + VCS protection. Files written:
- `.gitignore` (NEW — repo had none despite prior report claiming otherwise)
- `scripts/privacy_check.cjs` (NEW — importable leak scanner; findings never echo private text)
- `tests/privacy.test.cjs` (NEW — 6 cases incl. negative/seeded-leak + CDN false-positive regression)
- `scripts/check_handover.py` (FIX — no longer crashes on missing `.gitignore`)
- `assets/js/nutrition-data.js`, `nutrition-reviewed.json` (FIX — removed `data/private/…pdf` path from JAMA source entry, set `url: null`, keep public citation name)
- `.opencode/skills/solarize-fallback/SKILL.md`, `.opencode/commands/kickoff.md` (RESTORED — were declared in handover but missing)

Tests: `node --test tests/nutrition-core.test.cjs tests/privacy.test.cjs` → 15 pass / 0 fail; `node scripts/privacy_check.cjs` → PASS (16 files); `python scripts/check_handover.py` → ALL CHECKS PASS.
Negative findings: (1) NOT a git repo and NO `.gitignore` existed; (2) real leak: private JAMA PDF local path was embedded in two *served* assets («url»: "data/private/…pdf") — redacted; (3) the 4.3MB `context/…flavor-profile-analysis.json` and `Context information/` copy are order-derived, unreviewed → gitignored at P0.1 pending P0.2 audit; (4) fake "email" hit was Alpine.js `alpinejs@3.x.x` CDN version tag — fixed in scanner, regression test added.
Usage: well within Go allowance this turn. Blockers: none. User input needed only for P0.2 review of context drop content if sensitive.
## Session log — 2026-10-30, session 2 (AGENTS.md amendments + chore(lint) + P0.2)

Time (Lima): morning. Model: glm-5.3-flash. Commit before: bb2192d → after: (this commit).

Tasks/files this round:
1. **AGENTS.md amended** (rules 6–7: evidence standard "the expert test", every trade-off stated to user, no legal-digestion cycles; test rules: test per task/round, tautological tests prohibited, ESLint CC ceiling; error-fix research discipline; blocked-resource stop-and-surface rule). **CLAUDE.md created** referencing AGENTS.md. License-digestion text removed from context/README, fallback skill, SOURCE_INVENTORY.
2. **chore(lint) implemented**: `package.json` + ESLint 9 flat config (`eslint.config.mjs`), core `complexity` rule, ceiling **15** — evidence: SonarQube CC refactor threshold 15 (Campbell 2021), McCabe bands (11–20 moderate), ESLint raw default 20 judged too lenient as a gate. Legacy override exists ONLY for measured hotspots (currently unused — no violations after fixes). `npm run lint|test|privacy|check`.
3. **Lint findings fixed (all evidence-based, not dodged):**
   - `assets/js/app.js`: `mealPlanApp` flagged unused — root cause: Alpine `x-data` binding invisible to ESLint → explicit `window.mealPlanApp = mealPlanApp;` (globals were implicit; module conversion future-proofing). NOT deleted.
   - `assets/js/nutrition-core.js`: `estimateEnergy` CC 19 (>15) → extracted pure `validateEnergyInputs` + `buildEnergyFlags`; behavior unchanged, all 9 pre-existing tests pass.
   - `tests/nutrition-core.test.cjs`: dead helper `by` removed.
4. **P0.2 source inventory done**: `scripts/inventory_sources.py` (metadata-only hash audit) → `docs/source-inventory.json`; `tests/source_inventory.test.cjs` validates schema, drift detection, no-tracked-private — with 3 seeded-negative fixtures proving the verifier CAN fail. Tracked root `NUTRITION_RESEARCH.md` + `COMPLIANCE_REVIEW.md` scanned with P0.1 scanner → clean.

Tests: `npm test` → **19 pass / 0 fail**; `npx eslint .` → 0 problems; `node scripts/privacy_check.cjs` → PASS.
Negative findings + root causes: (1) first test draft used `assert.throws` on a verifier that returns problems instead of throwing — design mismatch, fixed by asserting on returned problems; (2) `NUTRITION_RESEARCH.md` (public) is byte-identical to a private drop artifact — already public, scans clean, documented; (3) context drop triple-stores identical data (user decision pending on dedup).
Trade-offs stated: CC ceiling 15 for gate but a legacy override slot (currently empty) exists so measured hotspots are ratcheted, not hacked; ESLint added as devDependency (~86 packages) — accepted for a reproducible `package-lock.json`, stated per docs rule.
Blockers: none. **Next ticket: P0.3** — served-site E2E baseline; command: `python3 -m http.server 8000` + existing `tests/test_ui_playwright.py` (attended to true server next round).

## Session log — 2026-10-30, session 2, part 2 (P0.3 served E2E)

- First-attempt pip install of Playwright blocked by PEP 668 (externally-managed env). Root cause/hypothesis: not a flake — system Python is managed. Resolution per expert practice: **consolidate on the existing pinned npm toolchain** (`npm i -D playwright`, chromium downloaded to user cache) instead of `--break-system-packages`. Trade-off stated: dev dependency count in package.json grew; browser binary (~104 MB) lives outside the repo in `~/Library/Caches/ms-playwright`.
- Old `tests/test_ui_playwright.py` is NOT runnable here: it hardcodes Linux path `/usr/bin/chromium`; superseded for QA evidence by `tests/e2e_served.cjs` (kept for reference until P7 replaces it with full locale coverage).
- Evidence (real served site, not `set_content`): title renders; 8 nav links; Alpine mounts; zero console/page errors; zero local 404s; `cdn.tailwindcss.com → 3.4.17` and `unpkg alpinejs@3.x.x → 3.17.5` resolve and load NOW — **floating major CDN pins are a reproducibility/time-bomb risk** (recorded as a real issue for P1 design: ship local vendored Alpine + compiled Tailwind per AGENTS.md architecture decision).
- Guard: dev/static server refuses `data/private|context*` with 403 (verified in-run).

Next single command/ticket: **P1.1** canonical schema; command: implement `docs/DATA_CONTRACT.md` schemas + fixture, tests first (`tests/data_contract.test.cjs`).

## Session log — 2026-10-30, session 2, part 3 (P1.1 canonical schema)

Files: `assets/js/domain-schema.js` (new, dual browser/Node UMD like nutrition-core.js), `tests/data_contract.test.cjs` (8 tests, seeded-negative first), package.json test script updated.

What the schema now makes structurally impossible (encoded, not convention):
- `parseFloat('1/2')`: quantities are exact rational/decimal strings only (`^…$` pattern; P1.3 will add the exact parser).
- Provenance-free stock claims: `availability: observed|verified` REQUIRES exact RFC-3339 observation timestamp + (sku|productUrl) + locale; date-only "2026-10-30" is rejected as not exact provenance (the strictness was discovered by the test catching a too-lax regex — kept exact).
- Pressure times (`pressureMin`/`releaseMin`) without pressure equipment listed → `pressure_without_equipment` (anti-inference rule from P4.2, enforced at P1 already).
- localDate is calendar-validated (`2026-02-30` → `invalid_local_date`), independent of UTC.
- ids follow the contract's own examples (`match-1`, `order-c32`): lowercase slugs with `_-` — first draft ID_RE was wrong vs contract; fixed by reading actual outputs.
- count-quantity basis must be `raw`; `dry` is meaningless for ml/count; units beyond canonical {count,g,kg,ml,l} (e.g. `cups`) rejected — all conversions belong in sourced conversion factors (P3).

Debug/analysis trail (per error-fix discipline): 3 rounds of failures → root causes were test bugs (self-inconsistent locale expectation, invalid `kg` seeded negative, stray unused var) plus 2 CC-15 violations refactored by extracting sub-rules (`storeListingRule`/`storePackageRule`, `ingredientUseRule`), NOT by disabling rules.
Trade-off stated: `kg`/`l` accepted in v0.1 recipe uses (contract's shopping example uses kg) with dimension mapping to g/ml; strict shape enforcement of `nutrition` status enum is `not-assessed|draft|assessed` — expandable, versioned `domain-schema/v0.1`.

Tests: 27 pass / 0 fail; lint 0 problems.
Next single command/ticket: **P1.2** importer — seven weighed recipes from `nutrition-reviewed.json` → normalized RecipeVersion fixtures + legacy-29 quarantine marking; test: round-trip import of the 7 curated recipes with quantity re-parsing (tests/import_weighed.test.cjs).

## Session log — 2026-10-30, session 2, part 4 (P1.2 importer)

Files: `assets/js/import-weighed.js` (new UMD pure module), `tests/import_weighed.test.cjs` (8 tests incl. real-file fixtures + seeded negatives), schema bumped to **v0.2** (`nameProvisional` semantics + `curated_extract` evidence source type).

What the importer now does (evidence-bearing, no invention):
- 7/7 weighed recipes import to schema-valid RecipeVersions; 41 ingredients manifest; quantities from float `560.0` → exact string `'560'` (float lucidity: `non_exact_quantity` refuses scientific-form and non-round-trip floats, never silently rounds).
- units: `each` → `count` (basis `raw`); prose `weightBasis` parses raw/cooked/dry or the recipe is quarantined with reasons.
- **`soy_sauce` decision (analysis recorded):** source marks `weightBasis: 'label dependent'` for the bottled liquid; physical basis at addition is `raw`, and label-dependence is a *composition* concern → imported as `raw` **plus warn `composition_label_dependent`** so nutrition stays null until brand label data exists. Both soy-sauce recipes import (they were being lost by strict reading P1.1 v0.1).
- Steps are verbatim English prose; NO invented ingredient refs, timers, thermometry, pressure fields, equipment, flavor tags or yields (`pressure_without_equipment` schema rule already prevents invented pressure steps).
- nutrition: `not-assessed`, sourceIds traceable to `nutrition-reported.json#curatedRecipes`; validationStatus `reviewPending` (weighed, but NOT kitchen-verified — honest status).
- Legacy 29: `importLegacyQuarantine` produces 29 inert quarantine records with `shoppingMathLocked: true`; they are NOT RecipeVersions (shopping aggregation must refuse them, per P1.2 ticket).

Debug trail (discipline applied): 3 root causes found by reading actual outputs, not guessing: (1) schema `english_only_name` fired even when `nameProvisional` allowed it — logic fixed; (2) 2 of 7 recipes quarantined over soy-sauce weightBasis — domain analysis above, rule designed (not patched-away); (3) leftover duplicated test assertions from an earlier edit — removed. CC-15 ceiling enforced: `importWeighed` (18) and `isIngredient` (21) refactored by extracting `useRecordFromItem`/`ingredientNameRule`.
Trade-off stated: `weightG` used as the quantity source for g/ml items (source keeps both `quantity` and `weightG`); divergence between them would be a data error to detect later at P3 aggregation, not here — recorded as future ticket.

Tests: 35 pass / 0 fail; lint clean.
Next single command/ticket: **P1.3** exact rational quantity parser + unit family conversions (no float): tests for 1/2, 2 1/2, ⅓, decimals, g↔kg, ml↔l, refusal to convert across dimensions without sourced factors; implement `assets/js/quantity.js` + `tests/quantity.test.cjs`.

## Session log — 2026-10-30, session 2, part 5 (P1.3 exact quantities)

Files: `assets/js/quantity.js` (new UMD pure module), `tests/quantity.test.cjs` (8 tests), package.json test list grows.

Engine facts (all test-proven, no pretty claims):
- Exact rational arithmetic: `⅓+⅓+⅓ = 1` exactly, `0.1+0.2 = 0.3` exactly where IEEE-754 drifts (test pinned).
- Parses `1/2`, `2 1/2`, 17 vulgar glyphs, integer and decimal strings to reduced (num,den) pairs with safe-integer guard (`q_overflow`); negatives and scientific form are REFUSED at parse (schema already guarantees nonnegative uses; subtraction in code handles pantry offsets in P3).
- Conversions: count identity; kg↔g, l↔ml via definitional family ratio with provenance `'canonical-definition'`. Cross-dimension `g→ml` throws `cross_dimension_no_sourced_factor` unless an explicit `{factor, sourceEvidenceId}` record is passed — even a bare factor value is refused (value isn't provenance).
- Aggregation: `1/2 + 2 count → 2.5 count` in ONE line; `kg` and `g` stay separate until converted (P3 rule), and `500 g + 0.75 kg = 1250 g` after explicit conversion.

Debug trail: 2 root causes: (1) vulgar-glyph substitution inserted a leading space AFTER `trim()` order was fixed; (2) my float-drift *control* assumption was wrong twice (`(1/3)*3` and `1/3+1/3+1/3` both round to exactly 1.0 in IEEE-754) — per the research rule the control was replaced with the documented `0.1+0.2 !== 0.3` exhibit. Analysed, not hand-waved.
Trade-off stated: quantity state stays in exact (num,den) integer rationals; UI converts via `toNumber()` for display only; BigInt is not used, so values cap at 2^53 (irrelevant at kitchen scale) and the guard throws (`q_overflow`) rather than silently losing precision..

Tests: 43 pass / 0 fail; lint clean.
Next single command/ticket: **P2.1** calendar core (done this pass — see part 6).

## Session log — 2026-10-30, session 2, part 6 (P2.1/P2.2 calendar core)

Files: `assets/js/calendar-core.js` (new UMD pure module), `tests/calendar.test.cjs` (6 tests), test list updated.

Confirmed facts (test-proven):
- `nextMonday` strictly-next-Monday semantics (P2.4 disclosure rule: "week containing today" is a separate call `weekOf(today)`, never conflated).
- `weekOf` Monday-anchored windows are correct across leap day (2028-02-29 inside its week), year rollover (2027-01-01 → week starts 2026-12-28), and month boundaries.
- `expandRepeatRule`: weekdays 0=Sun..6=Sat (Date.get indices, tested), weeks counted from the Monday of startDate so mid-week starts don't shorten the first week; exceptions honored; output ascending; `acrossWeeks` capped 1..105 (bounded expansion).
- `sumPortionsInRange`: inclusive ranges; same-day duplicate occurrences of the same recipe BOTH count (2+3 = 5 portions on 2026-11-02) — P2.2's "concurrent same recipe twice in a day permitted and correctly counted" now enforced in core, upstream of shopping math.
- All input/output dates validated as real calendar dates at 12:00 local noon in both directions (no UTC-rollover, timezone-safe even though Lima has no DST).

Trade-off stated: repeat rules expand eagerly to concrete dates (bounded) rather than lazy iterators — simpler to validate (each expansion is a real date) and trivially countable; re-expansion replaces rule output wholesale when the rule changes, recorded as the P2.3 persistence migration contract.

Tests: 49 pass / 0 fail; lint clean.
Next single command/ticket: **P3.1** shopping aggregation (pure): canonical ingredients + PlanEntries + baseServings scaling + pantry offsets + package rounding; tests include the contract transformations (2.5 onions → 3; 500ml+0.5L=1000ml; no cup/gram merge; optional exclusions; 4→2 servings = 0.5×).

## Session log — 2026-10-30, session 2, part 7 (P3.1 shopping aggregation engine)

Files: `assets/js/shopping-core.js` (new UMD pure module, deps injected Quantity + DomainSchema), `tests/shopping.test.cjs` (11 tests).

Every contract transformation from `DATA_CONTRACT.md §Required transformations` is now enforced in engine code with a test:
- `(1/2 + 2) count onion = 2.5` (at full scale), purchase `ceil → 3`-style default for produce count units (`ceil-count-default`).
- `500 g + 3/4 kg = 1250 g` merged into ONE line post-conversion; `30 ml + 1/2 l = 530 ml` likewise (canonical base units g/ml).
- `1 serving of 4-serving base = 0.25×` (`rice 125 g`, `oil 7.5 ml`, `onion 1/8`).
- optional excluded by default with `optional_excluded` audit, included on explicit choice.
- Pantry offsets require same ingredientId+unit+basis: `min(have,need)` consumed; cooked-grams pantry NEVER offsets dry grams (`pantry_basis_mismatch` per line + aggregate).
- raw/cooked from recipes stay separate lines with `basis_lines_not_merged` warning (no silent combine attempt).
- g/ml without recorded packaging → `needs_package_decision` (NO invented bundle); count units get the produce-ceiling default only.
- Quarantined plan references refuse the WHOLE output (`refused: true`, atomicity).
- Range filtering exact/inclusive; empty range → empty list (no zero filler).
- Words not yet tautology: purchaseRecommendation for `kg`-recorded packages converts via definitional family merge to line unit (`recorded-package` rule).

Debug trail: 4 initial failures were self-authored test defects (portions misused for full-scale expectation, missing optionalChoices, missing choices in merge expectation, wrong pantry semantics) + engine pantry line upgraded to consumed-min semantics per data-contract "netBuy intent". CC-33 monolith refactored into `validateEntries`/`totalsForRange`/`scaleTotals`/`applyOptional`/`assembleLines` — every helper lint-verifiably under 15.
Integration smoke on REAL imported data: 2 recipes × 4 portions each at full scale → 18 canonical lines, no refusal, 19 audit warnings (mostly needs_package_decision + optional_excluded) — the pipeline import→schema→calendar→shopping runs end-to-end.
Trade-off stated: kg/l packages record-free per-ingredient maps keyed by ingredientId (P3.3 will move to StoreProduct package rows with provenance); real purchase optimization/spend minimization stays P3.4, deliberately not built yet.

Tests: 59 pass / 0 fail; lint clean.
Next single command/ticket: **P2.3/P2.4 persistence + week disclosure** — versioned localStorage persistence with export/import + `America/Lima` "upcoming week" preference, then P3.2 UI gates the engine behind real names.

## Update template for next session
Time (Lima): …  Model: …  Commit before/after: …
Task, assumptions and AC: …  Files written: …
Tests command/output: …  Negative findings: …
Usage/quota/error: …  Blockers: …
Next single command/ticket: …
