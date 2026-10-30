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
Next single command/ticket: **P2.3/P2.4 persistence + week disclosure** — versioned localStorage persistence with export/import + `America/Lima` upcoming-week preference, then P3.2 UI gates the engine behind real names. (An intermediate part-8 tail recording "Tests: 66 / next P3.2/P3.3" was lost in the same editing accident as below; reconstructed:" Tests: 66 pass / 0 fail; lint clean.)

## Session log — 2026-10-30, session 2, part 8 (P2.3/P2.4 persistence core)

Files: `assets/js/storage-core.js` (new UMD pure module, backend injected — Map in tests, localStorage in browser), `tests/storage.test.cjs` (7 tests).

Test-proven behaviors:
- Checksummed state (`state/v1`, FNV-1a over canonical key-sorted JSON); **save and load hash rules were unified by debugging an actual mismatch** (save used to hash `"checksum":null` payload; load hashed minus-field content) — the checksum is now computed with the field deleted on both sides.
- Tampered payload → `checksum_mismatch` refusal with `preservedRaw` evidence kept (no silent wipe, no optimistic repair).
- Unknown/future schema version → `unsupported_schema_version` refusal; classification happens BEFORE checksum verification (unsigned legacy/future docs would otherwise masquerade as tampering).
- Legacy `meal-plan/legacy-v0` → backup written to `pgk-state-preMigration` BEFORE forward processing; state empties with explicit `migrationNeeded` marker — legacy plan content is NOT auto-fabricated into entries (P1.2 quarantine discipline carries over to persistence).
- Conflict merge: per-collection union by id, newest `updatedAt` wins headers/settings; both-written duplicate ids deduplicate (`p1` appearing in both tabs appears once).
- P2.4 week disclosure: `resolveWeek(today, policy)` returns `{label, mondayToSunday}` for `upcoming-week` (strict next Monday) vs `week-containing-today` — delegates to CalendarCore verbatim (test proves zero drift/copy-paste divergence).
- Boundary rule: `addPlanEntry` refuses schema-invalid OR duplicate-id entries at the edge (fail-fast upstream of persistence).

Trade-off stated: conflict policy is whole-collection union + last-writer-wins for scalars (documented; no per-field CRDT); multi-tab UI warn layer is a later gate in P7 E2E. Export bundle = the checksummed state doc itself; import path is `load()` on a doc-shaped object (verified path tested via storage round-trip).

Debug trail: 3 root causes: (1) hash-rule asymmetry (fixed above); (2) preservedRaw string vs parsed-object interface mismatch — parse-first chosen; (3) classification-before-checksum ordering. All three were found by reading real output, one fix each, no retries.

Tests: 66 pass / 0 fail; lint clean.

## Session log — 2026-10-30, session 2, part 9 (P3.3 Lima store catalog + matcher)

Files: `data/fixtures/lima-stores-v1.json` (new, structure-only), `assets/js/store-matches.js` (new pure matcher), schema **v0.3** (StoreProduct + RETAIL_MATCHING state ladder), `tests/store_matches.test.cjs` (7 tests).

Honesty-by-construction facts (each test-proven):
- Catalog rows carry ONLY: canonical ingredientId binding, retailer, `hypothesisPack` (pack-size hypothesis explicitly barred from math), nothing else. Titles, prices, SKUs, URLs, observation timestamps, store/district locale: all null → "0 provenance-free in stock claims" holds at the data layer. State ladder follows `docs/RETAIL_MATCHING.md`: notChecked / listedWithoutLocation / listedForLocation / outOfStockAtTime / unavailable / unknown / confirmedAtCheckout.
- Matcher binds candidates by exact canonical ingredientId only (alias-substitution prohibition literal; cebolla roja ≠ cebolla china by fixture row separation). `recommended` is ALWAYS null in v0.1 — no match promoted before live verification.
- `verifiedPackages()` derives ONLY from recorded package rows; a recorded 1000 g Wong rice pack flips shopping advice to `1250 g → ceil = 2 × recorded-package` (integration test end-to-end with shopping-core).
- Stock/price claims without the full provenance quadruple (exact timestamp + store+district locale + verbatim title + URL/sku, depending on state) remain structurally impossible.
- Schema-invalid catalog rows are skipped WITH audit warning (never silently).
- Root cause from one real failure: fixture shipped `locale: 'Lima'` — a coarse regional string; the retail doc requires store+district context. Fixture locales → null pending real verification; claim/price rules demand non-null.
- Trade-off stated: alias-based matching is intentionally UNUSED in v0.1 because catalog titles do not exist yet — alias matching without verbatim titles would match hallucinated text (a fake solved problem). When real titles arrive, aliases get re-evaluated against them.

Tests: 73 pass / 0 fail; lint clean; privacy scan PASS.
Tests: 73 pass / 0 fail; lint clean; privacy scan PASS (now covering `data/fixtures/**` in the served-public set too).

## Session log — 2026-10-30, session 2, part 10 (P3.2 shopping-list UI, development preview)

Files: `assets/js/shopping-ui.js` (new vanilla-DOM UMD component — deliberately NOT Alpine-bound to avoid dual state systems), `index.html` (nav item '🧾 Shopping Engine (v4)', section `#shopengine`, dependency-ordered script tags, fixture-preload + boot), `tests/e2e_served.cjs` (shopping-flow audit: plan entry → grouped render), `scripts/privacy_check.cjs` (scans `data/fixtures/**`).

E2E evidence (real served site, Chromium):
- shopping-flow PASS: section mounted, recipe select + date + portions entry added, `nikkei-salmon-bowl` full-scale → **10 grouped lines rendered**, aggregate warnings bar visible, 0 refusals, 0 page errors, no 390px overflow. Screenshot `tests/e2e_shopping_flow.png`.
- Nav now 9 links; Alpine still mounts; base audits unchanged PASS.

Root-cause trail (4 real fixes, zero retry loops):
1. UI never booted — script was loaded but `ShoppingUI.init()` was never called (fixture-fetch then boot, with fallback).
2. `#engine-from/#engine-to` live OUTSIDE the plan form but were queried via `form.querySelector` → null deref; section-scope queries instead.
3. **Script-order bug in index.html**: `storage-core.js` evaluates `root.CalendarCore` at load time but sat before `calendar-core.js` → re-ordered quantity→schema→calendar→storage→import→storeMatches→shoppingCore→ui.
4. Fixture catalog now rides a preload before boot (fallback boot with empty catalog keeps UI honest when offline).

Trade-offs stated: (a) plan entries come from a basic add-form (no repeat-rule/copy/move UI yet — P2.2 UI gates later); (b) es-PE grouping labels are interim bilingual strings pending P6 locales; (c) `__pgkLastList` window global is the copy/print source of truth until P7 replaces it with state sync; (d) service-worker cache versioning still pending — flagged for P8 deploy gate (fresh contexts unaffected).
Honest labeling: all canonical recipe names currently render with "(EN provisional)" tag — per contract the es-PE manifest names do not exist yet; nothing is presented as Spanish that isn't.

Tests: 73 unit pass / 0 fail; E2E PASS (incl. shopping-flow); lint clean; privacy scan PASS.
Next single command/ticket: done this pass (P3.5 — see part 11).

## Session log — 2026-10-30, session 2, part 11 (P3.5 shopper es-PE + print/CSV)

Files: `assets/js/food-names-es-pe.js` (new UMD dictionary, REVIEW_STATUS draft-machine-assisted-needs-native-review), `assets/js/shopping-ui.js` (es-PE line names + draft tag, es_pe_name CSV column, @media print styles), `index.html` script order + `tests/shopper_view.test.cjs` (5 tests), E2E shopping-flow extended.

Facts:
- ALL 41 canonical ingredients have at least a DRAFT es-PE callsign (test-pinned coverage; unknown ids fail soft to null — never invented).
- Display: 'salmón (es-PE borrador)' style tags keep P6's no-fake-fluency rule honest; CSV lines carry the es-PE name column first.
- Print: dedicated @media print sheet — shopper list only (forms/nav/warnings hidden), es-PE print header explicitly says 'borrador — no implica verificación de tienda' (no silent pretending of store verification on paper).
- E2E: shopping flow now asserts both the es-PE name and the draft tag render (PASS), plus 78 unit tests.
- User standing instructions recorded in PROGRESS: messages must start with 'PillB'; outside-project-path access requires prior justification.
- Self-caught dictionary typos (machine-draft with gibberish entries) corrected before commit — drafts must be wrong-in-content, never sloppy.

Tests: 78 pass / 0 fail; E2E PASS; lint clean; privacy PASS.
Next single command/ticket: done this pass (Peru-vocabulary correction — part 12).

## Session log — 2026-10-30, session 2, part 12 (Peru vocabulary correction round)

Owner correction applied (evidence-driven, not vibes): machine-draft 'chocllo superior' is NOT a Peruvian product term; web search produced no usable results (logged once per blocked-resource rule), so names were rebuilt around vocab a Lima shopper expects at Wong/Metro/Plaza Vea, per the owner's instruction and `docs/RETAIL_MATCHING.md` §es-PE rendering.

Dictionary restructured (`assets/js/food-names-es-pe.js` v2):
- Primary names now store-plausible: pepino (not pepinillo-first), hongos (champiñones/setas family), menestras, edamame, sillao, fondo de verduras, cocoa (the label word), fideos integrales (store word), res: pulpa paleta marked 'equiv. aproximada a chuck' (butchery-tradition caveat, not fake certainty).
- NEW synonyms layer `synonymsFor(id)` — matching robustness ONLY, never auto-substitution: e.g. berries → arándanos/frutillas/frambuesas; ají → amarillo/rocoto/limo; sillao → salsa de soya; palta ↔ aguacate; cebolla roja/blanca stay DISTINCT VARIANTS of onion (not substitutes).
- FORBIDDEN token list + selfAudit(): 'chocllo superior', 'cocazuela' can never re-enter drafts (test-pinned); caught & removed an English synonym leak ('chard') during self-review.
- REenaming REVIEW_STATUS → 'draft-store-plausible-needs-native-review'; test updated with the rename. Debug trail: 1 API-rename mismatch (bilingual vs nameBilingual) found by real browser error output, one fix.

UI/CSV: shopper lines now show up to 2 store synonyms in parentheses after the primary name; CSV cells 'es (syn1 | syn2 | syn3)' for robustness against search variability. E2E asserts es-PE name AND draft tag still render.

Tests: 80 pass / 0 fail; E2E PASS; lint clean.

## Session log — 2026-10-30, session 2, part 13 (P2.2 planner core + planner UI)

Files: `assets/js/planner-core.js` (new pure ops: move/copy/delete/applyRepeat), `assets/js/planner-ui.js` (new vanilla-DOM; shared model with ShoppingUI), `index.html` (section `#planner`, nav '🗓 Planner (v4)', two more scripts, chained boot), `tests/planner_core.test.cjs` (8 tests), E2E `planner-flow` audit (new screenshot).

Test-proven semantics (each decision documented, not absorbed):
- Move changes ONLY localDate (id stability avoids downstream merge artifacts); Copy allocates fresh id; same-day twins legal; invalid dates refuse WITH no mutation.
- Repeat = **N forward occurrences** (mid-week starts no longer silently lose the first weekday — engine pads the anchor window and takes first N after source), exceptions skip dates, rule-family tag `rep-<source>-<weekdays>w<N>` is schema-slug-safe (ID_RE denied colons — schema authority kept, code complied), re-apply is IDEMPOTENT via the tag while hand-made same-day twins stay distinct.
- Keyboard-first: no drag anywhere in v4 (AGENTS.md a11y + drag-optional clause); every action is a labeled button/date input; srOnly labels for move fields; aria-live status.

Root-cause trail (4 real fixes from real output, zero retries):
1. Group id colons violating DomainSchema.ID_RE → schema-complying slug (schema stays authority).
2. Rename mismatch `bilingual` vs `nameBilingual` caught by the browser error line, fixed at the caller.
3. Planner showed stale list after ShoppingUI mutation — missing cross-refresh; added shared `__pgkRefreshPlanner` registry hook (planner→shopping refresh already existed).
4. Lint cleanup: `dates` unused expansion path, dead bind/render stubs removed.

E2E evidence: planner-flow PASS — add entry via shopping form (11-03, portions 4) → planner shows 1 → 'Repeat weekly (same weekday)' ×2 → 3 entries, status 'repeat ok', shopping re-render fresh; 0 page errors. Shopping-flow still PASS.

Tests: 88 pass / 0 fail; E2E PASS (both flows); lint clean; privacy PASS.
Known-scope statement: resolved THIS pass — family badges + separate copy-date shipped (see part 14).
Next single command/ticket: done this pass (P2 polish — part 14 below); next is P4.

## Session log — 2026-10-30, session 2, part 14 (P2 UI polish)

Files: `assets/js/planner-ui.js` (family badges + sort + separate copy-date), `tests/e2e_served.cjs` (planner-flow assert badge + copy semantics), new screenshot.

Facts: entries sharing a `rep-…` family render '⟲×N' with title tooltip; status line reports repeat families; 'Copy →' now commits against its OWN date field (`data-op="copydate"`), defaulting to the row date; E2E planner-flow PASS with `familyBadges: 2`, `afterCopy: 4`.

Tests: 88 pass / 0 fail; E2E PASS (desktop/mobile/shopping/planner flows); lint clean.

## Session log — 2026-10-30, session 2, part 15 (P4.1/P4.3 cook-mode core)

Files: `assets/js/cooking-core.js` (new UMD pure module), `tests/cooking.test.cjs` (6 tests), test list updated.

Evidence-grounded (cited, zero invention):
- `MIN_TEMP_C` mirrors the FoodSafety.gov Safe Minimum Internal Temperature Table (poultry 74; ground 71; whole cuts 63+3-min rest; fish 63; leftovers reheat 74) — the constant lives next to its `SOURCE` string; unknown food types stay `null` (never guessed).
- **Step safety gate**: sub-minimum target temps are refused named the floor; protein steps REQUIRE `checkpoint: 'thermometer'` (color/time cues are not provenance for safety); whole cuts require the 3-minute rest field; unknown/undelared foodType refuses.
- **USDA leftovers builder**: 3-4 days ≤4°C, reheat to 74°C; >4 days → 'beyond-usda-guideline-window' with a discard recommendation; invalid/future-date misuse refuses instead of emitting advice ('invalid_dates').
- **P4.2 structural gate**: `pressureValidated` is TRUE only with (a) pressure equipment listed, (b) provenance record sourceType ∈ {kitchen_experiment, public_doc}, (c) the safety checklist fields affirmed (min liquid, fill line, release model). `generated_report` provenance is explicitly NOT validation; no stovetop-minute inference anywhere.
- **P4.3 dual-review map**: food-scientist (quantities, cooking-outcome evidence) AND an independent food-safety reviewer (temperatures, chilling/storage, allergens, pressure safety, ingredient suitability) each need field-level evidence + approval — `readyForPublication` is false by default.

Debug trail: 1 test-authoring bug (missing temp argument), 2 semantic improvements from real output before shaming-out proofs on (a) the rest rule being part of the standard (kept enforced, test meets '63 without rest' → exactly ['rest_time_required']) and (b) pressure checklist fields required in the validating record (test tightened rather than module loosened).

Tests: 94 pass / 0 fail; lint clean.
Next single command/ticket: **P4.1 cook-mode UI** (step cards over the imported 7 recipes with gate wiring; cooking-mode badge showing validated vs generic directions), then P4.4 test-cook workflow.

## Update template for next session

## Update template for next session

## Standing user instructions (do not lose)

## Standing user instructions (do not lose)
- Every message to the user must START with their name: PillB.
- Before requesting access to any path outside the project folder: first try to avoid the need; if unavoidable, explain which file and why BEFORE requesting access.

## Update template for next session
Time (Lima): …  Model: …  Commit before/after: …
Task, assumptions and AC: …  Files written: …
Tests command/output: …  Negative findings: …
Usage/quota/error: …  Blockers: …
Next single command/ticket: …
