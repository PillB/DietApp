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

## Update template for next session
Time (Lima): …  Model: …  Commit before/after: …
Task, assumptions and AC: …  Files written: …
Tests command/output: …  Negative findings: …
Usage/quota/error: …  Blockers: …
Next single command/ticket: …
