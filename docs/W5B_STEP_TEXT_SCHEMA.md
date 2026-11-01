# W5b — STEP-TEXT SINGLE-SOURCE SCHEMA (design for the next dev batch)

Status: DESIGN (not implemented). Written 2026-11-01 at main `0b74043`.
Locked by: `npm run r3` :: 'R3 RESULT: 0 failed layers' (11 layers, this session).

---

## 1. Problem (the risk register)

Step text exists in FOUR shapes across FOUR files:

| Corpus | Location | Shape |
|---|---|---|
| curated 7 (weighed) | `assets/js/nutrition-data.js` `.curatedRecipes[].steps[]` | flat EN strings (30 lines) |
| curated 7 — es | `data/reference/step-translations-espe.v1.json` `.translations[id][i]` | parallel array, polish-tagged |
| docx 4 (owner) | `data/canonical/docx-diet-recipes-canon.v1.json` `.recipes[].steps[]` | rich: `{id, order, station, text:{en}, ingredients[], timeMin, targetTempC, checkpoint}` — es is authored inline at the struct's parallel field |
| legacy 29 | `meal-plan-data.json` (synced → `data.js`) `.recipes[].method[]` + `.miseEnPlace[]` | EN prose, stations embedded in prose |

Consequences of the parallel-file layout (already bit us twice):
1. **D41/D42** — the served-vs-source drift class (themeEs added to JSON but browser read `data.js`).
2. The cook card consumes translations via runtime `fetch` + `window.__pgkStepTranslations`; the
   nutrition preview does NOT (shows EN only, `nutrition-ui.js` `drawRecipe()`).
3. Translated length must equal EN length — nothing asserts that today (misalignment would
   silently pair the wrong number with the wrong ingredient language).
4. The upcoming `origin/audit/recipe-qa-20261031` adds `tests/step_consumption.test.cjs` which
   overlaps the covered-by-`tests/recipe_used_remaining.test.cjs` used/remaining ledger — a
   future duplicate-authority risk.

## 2. Target schema (adopt docx's structure — it is already the richest)

```jsonc
// one canonical shape for every step, whichever corpus it starts in:
{
  "id": "s3",                      // stable, recipe-scoped
  "order": 3,                      // explicit
  "station": "Station B",          // optional (curated-7/legacy may derive)
  "text": {
    "en": "Steam the edamame...",  // source of safety authority (per handover §9)
    "esPE": "Cocer las vainitas de soya al vapor...", // draft — see status
    "esStatus": "draft"            // 'draft' | 'authored-es' | 'native-reviewed'
  },
  "ingredients": ["edamame"],      // optional machine-readable token link
  "timeMin": null,                 // optional
  "targetTempC": null,             // optional — feeds cooking-core gates when present
  "checkpoint": null               // optional — thermometer instruction id
}
```

Hard rules (per `AGENTS.md` §recipe-status and handover §9):
- `text.en` ALWAYS present and ALWAYS the safety-gate authority (`cooking-core.extractHeatClaims` reads it).
- `text.esPE` may be absent; when present it MUST carry `esStatus` — UI renders
  `[es-PE borrador]`/'authored-es' and refuses the word 'verified' unless
  `esStatus === 'native-reviewed'` (which requires the owner's native sign-off — LEDGER-6).
- NO body may lower `targetTempC` floors (see `tests/safety_research_pinned.test.cjs`).

## 3. Migration plan (three surgical PRs)

### PR-1 — `assets/js/step-text.js` (adapter; zero data moves)
```
stepTextsOf(recipeFamily, id, deps) -> Step[]  // {id, order, station?, text:{en, esPE, esStatus}, ...}
// families: 'docx' (canon pass-through), 'curated' (EN + translations[id]),
//           'legacy' (method[] prose; esStatus:'none'; notice rendered by caller)
```
- Runtime `deps` = `{ translations: window.__pgkStepTranslations }` (still fetched at boot).
- Length invariant test (NEW, blocks the misalignment class):
  `tests/step_alignment.test.cjs` — for each curated-7: `translations[id].length === steps.length`.
- Acceptance: `cook-mode-ui.js` renderSteps switches to the adapter with byte-equal HTML
  output (snapshot test on the default recipe card).

### PR-2 — consumers read the adapter
1. `cook-mode-ui.js` (lines ~118-127) — keep the EN authority line + `<ES-PE: …>` line;
   derive both from the adapter; delete the bespoke `__pgkStepTranslations` lookup.
2. `nutrition-ui.js` `drawRecipe()` — now renders the es step lines too (parity with cook card).
3. The v3 recipe modal steps — same adapter.
Acceptance: probing the LIVE es-PE cook card shows the `ES-PE:` line for curated AND nutrition
preview; `tests/cook_mode.test.cjs` + the 198-suite stay green; `npm run sync -- --check` clean.

### PR-3 — legacy-29 (owner-gated)
Translate `method[]` into the schema AFTER the native review (LEDGER-6). Until then
`esStatus: 'none'` and the existing `(EN — sin traducción)` notice stays.

## 4. Explicit trade-offs (per AGENTS §evidence — surface, never silent)
- **Safety text authority stays EN** (handover §9): the engine gates read `text.en`; es lines
  are display-only. This is a superset of today, so no reviewer sign-off is lost.
- The dual-line cook card (EN + ES) is retained — it lets a Spanish-speaking cook verify a
  claim line against the gate-flagged source; removing it would require a native-review
  decision that is NOT recorded.
- Runtime fetch of translations continues to work by `Promise` preload (unchanged behavior)
  until PR-3 moves the text into the canon, avoiding a build system.
- The audit branch's `step_consumption.test.cjs` may duplicate the used/remaining ledger —
  after W5b lands, reconcile with `tests/recipe_used_remaining.test.cjs` and delete whichever
  loses authority (keep the one covering BOTH arrays and docx).

## 5. What a dev agent must NOT do
- No temp-floor softening (D51 fixtures refuse).
- No hand edits to `assets/js/data.js` — always `meal-plan-data.json` + `npm run sync` (D42).
- No new i18n key without all 6 locales (tests/i18n.test.cjs refuses).
- Every new test must include a seeded-negative or it fails the session gate.
