# SUPERVISOR PRODUCTION PLAN — 2026-10-31 (part 62 post-rebase)

Audience: developer agent executing fixes under the rules in `AGENTS.md` (ledger discipline,
seeded-negative tests, es-PE decree, 5-lens recipe red-team). Everything below is verifiable
from the repo at or after commit `a5af534` (main).

---

## 0. State snapshot (verified live & in CI this session)

| Layer | Status at `a5af534` |
|---|---|
| `npm test` | **190/190** (my 180 + interleaved lane's 10) |
| `npm run live` | PASS (after routing-interop fix, §2) |
| `npm run redteam` / `redteam2` | 0 findings / 27 PASS |
| `npm run audit` (33) / `staging` / `geometry` / `e2e` | PASS |
| Pages build | `built`, deploys every push (~60 s + CDN lag up to ~4 min) |
| CI | "Post-deploy Pages Chrome and asset parity" — one past **failure** diagnosed §4 |

**Concurrent-lane protocol (READ FIRST):** main received commits from a parallel lane
(`37a8aa8 fix(router): render five canonical engine views`, `cba25aa fix(shopping): persist
checked purchases`, `d629824 test(live): await engine readiness`, plus CI/workflow commits
`548a31d`, `d8828ce`, `0938a39`, `e2e48f9`). Branch `origin/audit/recipe-qa-20261031` holds
es-PE assertion updates (`dceb09f`, `20b5382`). **Before each chore, `git pull --rebase` and
re-run `npm test`.** Do not duplicate fixes already landed on main.

---

## 1. Already executed this session (do NOT redo)

1. **English text sweep + fixes, rounds 1–4** (commits `f189cdc`→`2411af0`):
   - `index.html`: all static chrome → es-PE (header subline `79`, Imprimir `91`, calendar hint `132`,
     Abrir día `176`, search placeholder `214`, Copiar todo `243`, knowledge kicker `328`,
     nutrition panels `361-422`, compliance caution `269`, dashboard tile `129`).
   - `assets/js/planner-ui.js`: skeleton/entry rows/statuses → 20 new i18n keys ×6 locales
     (`assets/js/i18n.js` keys `planner.*`, test-enforced by `tests/i18n.test.cjs`).
   - `assets/js/nutrition-ui.js`: language default follows the app (was EN), 8 es branches,
     legacy-audit summary + issue stems es (`STEMS_ES` map near line `72`).
   - `assets/js/shopping-ui.js`: statuses → `shopping.added`/`planner.refused` keys.
   - `assets/js/cook-mode-ui.js`: 8 new keys (`nutrition.allComposed`, `nutrition.tpcaNote`,
     `cook.noDiagram`, `cook.diagramCaption`, `cook.stationAxis`, …).
   - `assets/js/i18n.js`, `flavor-core.js`, `flavor-ranking.js`, `flavor-ui.js`, `weighin-ui.js`:
     atlas caveats/status/kicker labels es (`weighin.recipeLabel`, `cookmode.recipeLabel`).
   - `assets/js/app.js`: `kmTitleEs` map + `complianceMetrics()` labels → es.
   - `meal-plan-data.json` → served copy via `npm run sync` (LEDGER-D42):
     `executiveSummaryEs`, `themeEs`, `highlightsEs`, `descriptionEs` ×34, `labelEs` ×33,
     `complianceAudit.{summaryEs,majorCorrectionsEs,statusEs,nutrientAuditEs}`,
     `dietGuidelineRules[{labelEs,ruleEs}]`, per-recipe `statusEs` ×29, `revisionNotesEs` ×49,
     `auditSummaryEs` ×29.
   - **Remaining EN is intentional**: legacy-29 recipe names/method steps (dual-language display
     by design — EN source + `ES-PE:` line, `cook-mode-ui.js:118-125`) under the
     "(EN — sin traducción)" notice. Closing that needs a **native reviewer** (LEDGER-6).

2. **Math red-team + engine hardening** (this session, commits `5d4e481`, `faaf0b7`, `77d7f47`,
   `1870bd4`, `2411af0`, `a5af534`):
   - `scripts/sync_data_js.cjs` + `npm run sync` / `--check` — closes the served-vs-source drift
     class (D42). **Any future data edit in `meal-plan-data.json` MUST end with `npm run sync`.**
   - `assets/js/shopping-core.js:167-172` — new guard: `from > to` refuses `inverted_range`
     (was a silent empty list).
   - `assets/js/shopping-ui.js:181-192` — UI refusal with es message
     (`shopping.rangeInvalid` key); `bind()` hoists an interpolation-capable `t()`
     **ROOT CAUSE recorded: `t()` was skeleton-scoped; submit threw `ReferenceError: t is not
     defined` so the 'Agregado…' status never rendered** (caught live, build `faaf0b7`).
   - New tests: `tests/shopping_range.test.cjs` (3), `tests/recipe_used_remaining.test.cjs` (4):
     batch-linked shopping ≡ declared totals exactly; 1-portion ≡ exact fraction; dual-unit
     domains (`each`/`count` vs `g`/`ml`) verified honest; step-claims ledger (used ≤ available,
     remaining ≥ 0) across all 7 curated recipes + 4 docx canonical; **0 overdrafts found**;
     seeded-negative proves the harness flips RED on a 900 g claim vs 560 g declared.

3. **Routing-interop fixes for the routed engine views** (commit `a5af534`):
   `tests/e2e_live.cjs:79-92` (route `#shopengine`/`#planner`/`#cookmode` +
   `waitForSelector(:visible)`), `tests/redteam_v2_live.cjs:112-118`, `tests/redteam_live.cjs`
   (`47`, `64`, `99`, `121`). Root cause: `37a8aa8` made engine panels routed views
   (`index.html:425-429` now carry `x-show="view === …"`); walkers that filled routed-hidden
   panels hung. Verified: POST-interaction matrix — 13 nav links, 5-locale rebind propagation,
   cook dropdown ×11 recipes, date edges (same-day, end<start), portion edges 0/25 refused,
   repeat×1/×0 semantics, CSV/print controls, 0 page errors.

---

## 2. Open items for the developer agent (ordered, self-contained)

### W1 — Research-validated temperature/times audit (foundation already laid)
Verified against authorities this session; convert into code comments + a test fixture:
- **Salmon 63 °C** (data/curated recipes + cook core gate): FDA/USDA fish standard = 145 °F
  (63 °C) immediate-pasteurization. PMC study (2020, *Sous-vide salmon 57 vs 63 °C*):
  63 °C×80 min ⇒ best microbiological quality after 10-day storage; 57 °C×20 min NOT suitable
  for storage. Baldwin for at-risk diners: 60 °C × 1.5 h (1-in fillet). ISVA: sous-vide fish is
  usually NON-pasteurizing ⇒ sashimi-grade sourcing or parasite-freeze (-20 °C × 7 days, FDA)
  + 4-hour danger-zone rule. → Action: in `tests/cooking.test.cjs`, add a fixture asserting the
  gate's salmon claim range is `[63, 74]` with a source note (do NOT lower it).
- **Birria pressure 50 min HIGH + ≥15 min natural release** (`birria-beans-rice` steps):
  corpus of authorities (Thai Caliente 50 min/3 lb, Pressure Cooking Today 60 min + 195 °F/91 °C
  internal for fall-apart, The Forked Spoon 50 min natural, dadcooksdinner 45 min chuck+ribs)
  validates 40–60 min; the app text adds model-dependent guidance — compliant. → Action: add
  `step-claims` fixture pinning `50 ±10 min` for beef chuck dishes with citations in the test
  comment; extend `tests/step_translations.test.cjs` coverage if the es-PE steps drift.
- **Chicken 74 °C** (`aji-chicken-tacos`): USDA poultry standard. Already pinned (63 °C ×2 in
  tests). No change.

### W2 — Remaining EN inventory (owned by LEDGER-6; owner decision)
Run the TreeWalker sweep (pattern in the transcript, `tests/es_sweep_live_final2.json`) after
each depoly to confirm the chrome classes stay at ~0. Remaining legitimate EN artifacts:
1. Legacy-29 titles (recipes/calendar cards/modal) — needs `(EN — sin traducción)` tag (present).
2. Curated-7 `steps`/`note`/`science` EN alongside ES-PE lines (dual-language by design,
   `cook-mode-ui.js:118-125`).
3. `data.js` recipe-corpus body (mise/méthodes text) — same notice class.
If the owner signs off native review, generate `esPE` fields for the 29 names through
`npm run sync` (never hand-edit `data.js`).

### W3 — CI hardening (in-flight from the other lane, verify on next cycle)
Current: new workflow "Post-deploy Pages Chrome and asset parity" runs
`tests/live_pages_walkthrough.cjs` (26 routes × 14 interactions + SHA-256 parity).
- One failure already root-caused: `41248717509` (5 route failures = the routed-view class
  fixed in §1.3 + `d629824` readiness guard; all later runs success).
- Action: confirm the run triggered by `a5af534` is fully green; if `live_pages_walkthrough`
  still reports any route failure, use its emitted report
  `tests/live_pages_independent_report.json` to pinpoint (that's exactly why the report exists).
- Watch: all currently-queued runs come from **both** lanes' pushes — keep main's gate matrix
  (`npm run r3`) the arbiter to avoid dual authoritative suites.

### W4 — Branch handling
`origin/audit/recipe-qa-20261031` (commits `7849952`, `20b5382`, `dceb09f`):
i18n "finalized provisional-name & quantity labels" + shopper draft-tag assertion. Either
(a) merge it after a green `npm run r3`, or (b) reject to keep the `[es-PE borrador]` draft
markers if the branch removed them — **check the diff for draft-marker removal
(`git diff main...origin/audit/recipe-qa-20261031 -- assets/js data docs`) before you merge.**
Do not merge blind: the es-PE decree says draft-tagged until native review.

### W5 — Design/architecture (next sprint)
1. **Single source of truth for step text**: currently EN prose in `data.js` curiosities +
   `nutrition-data.js` + docx canon; es in `step-translations-espe.v1.json` + docx authored.
   Proposal: one `steps` object per recipe with `{en, esPE, reviewStatus}` — removes the
   parallel-file risk that D41/D42 already had to patch twice.
2. **Router consolidation**: `37a8aa8`'s view registry + my `kmTitleEs`/sweep bindings live in
   separate places — consider one `app.js`-side `VIEW_CONFIG` pairing route, nav label key,
   and section id, so future walkers synthesise interactivity from config (removes the
   timeout class the walkers hit in §1.3).
3. **CI on empirical sampling**: add a weekly scheduled run of `npm run r3` against Pages
   (asset-parity + es-PE smoke) so drift is caught without a push.

---

## 3. Verification commands for W1–W3

```
git pull --rebase
npm test && npm run e2e && npm run r3
npm run sync -- --check    # served-copy drift guard
npm run live && npm run redteam && npm run redteam2 && npm run audit
node --test tests/shopping_range.test.cjs tests/recipe_used_remaining.test.cjs
```

---

## 4. Ledger entries to reference
- **D48**: shopping engine `inverted_range` guard + seeded-negative (`tests/shopping_range.test.cjs`).
- **D49**: recipe↔shopping math identity (batch ≡ declared; 1-portion ≡ fraction) + used/remaining
  step ledger 0 overdrafts (`tests/recipe_used_remaining.test.cjs`).
- **D50**: routing-interop fixes + CI run `41248717509` root-cause + research citations.

## 5. Research citations (validated this session)
- USDA/FDA fish 145 °F (63 °C): FDA *How to prevent anisakiasis* guidance.
- PMC 2020 salmon sous-vide 57 vs 63 °C study (63 °C×80 min quality/safety).
- Baldwin (via sousvideways) 60 °C × 1.5 h for vulnerable diners; 52 °C/125 °F 45 min sweet spot.
- ISVA advanced food safety: 52 °C danger zone, 4-hour rule, sashimi-grade note.
- Birria pressure corpus: 40–60 min HIGH (Thai Caliente 50/3 lb; PressureCookingToday 60 min +
  195 °F internal check; ForkedSpoon 50 min natural; dadcooksdinner 45 min).
