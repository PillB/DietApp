# DietApp — implicit state-machine and integration audit
Audit: 2026-11-22, Lima | Baseline SHA: bea506642117920fbe3bfdae0529d7e9230b7871 | Candidate branch: audit/state-machines-2026-11-22

## Scope and accuracy boundary
Inspected index.html, app.js, calendar/planner/storage/shopping/nutrition/cook-mode/weigh-in JavaScript, service-worker.js, tests, GitHub workflows and maintainer documentation. This report distinguishes observed code, implemented fixes, and unverified end-to-end assumptions. Existing app **does not** have a unified editable month/week/day calendar or a first-run wizard.

## Fundamental data topology — three unsynchronized planning stores

~~~mermaid
flowchart TB
  HTML["index.html / SPA shell"] --> LEG["MEAL_PLAN_DATA / data.js<br/>28 editorial days / 4 weeks"]
  HTML --> NUT["nutrition-ui.js<br/>gourmet-nutrition-schedule-v1<br/>sample schedule"]
  HTML --> SHOP["ShoppingUI.init -> StorageCore.load"]
  SHOP --> CAN["Canonical PlanEntries<br/>pgk-state-v1 in localStorage"]
  CAN --> PL["PlannerUI edits / repetition"]
  CAN --> CALC["ShoppingCore date-range projection"]
  CAN --> WEIGH["WeighInUI / CookModeUI shared model"]
  LEG --> LVIEW["Legacy Calendar / Week / Day / Shopping"]
  NUT --> NVIEW["Nutrition sample schedule + shopping"]
  CAN -. "NO automatic mirroring" .-> LEG
  CAN -. "NO automatic mirroring" .-> NUT
~~~

**Root cause of contradictory pages:** editorial menu views use static strings and week indices, Nutrition uses its own saved sample events, while canonical Planner/Shopping Engine uses dated PlanEntries. No deterministic recipe/date/portion mapping exists between all three; silently auto-importing them is unsafe. Candidate UI labels explicitly distinguish examples and link to the canonical planner. **Full unification remains OPEN.**

## Complete inventory of observed implicit machines

| ID | Machine / transitions | State owner | Guard / main risk |
|---|---|---|---|
| S01 | boot loading → async fetch → ready, retry, failed | index.html inline JS | missing dependencies / failed state hydration |
| S02 | route URL hash → dashboard/calendar/week/day/shopping/recipes/planner/shopengine etc. | app.js Alpine | malformed route params; back/forward |
| S03 | editorial fixed four-week/day grid | data.js, app.js | **not** saved PlanEntries |
| S04 | separate Nutrition sample schedule → add/repeat/remove/reset | nutrition-ui.js, own localStorage key | **not** canonical PlanEntries |
| S05 | canonical plan empty/loaded/error → add/move/copy/repeat/delete → saved/refused | StorageCore + PlannerCore | invalid state, partial writes |
| S06 | weekday expansion → exceptions → idempotent repeat family | CalendarCore + PlannerCore | timezone, leap date, duplicate entries |
| S07 | optimistic plan edit: snapshot → draft → validated/saved or rolled back | StorageCore.transact candidate | simultaneous multi-tab CAS not atomic |
| S08 | other-tab storage event → validate/reload shared in-memory model | ShoppingUI candidate | no cross-device sync; invalid remote state |
| S09 | date-range shopper → ingredient aggregation → package/optional/pantry | ShoppingCore/ShoppingUI | unit and basis must match |
| S10 | legacy shopping checked/unchecked/reset | app.js; gourmet-shopping-checks | different checklist than shopper engine |
| S11 | computed shopper checked/unchecked / range change | shopping-ui.js; pgk:shopper-checked:v1 | changed quantity changes key |
| S12 | locale switch → rerender/rebind | i18n subscriptions | lost input, duplicate listeners, incorrect warning translations |
| S13 | recipe search → modal open → close | app.js | keyboard/focus restoration unverified |
| S14 | cooking recipe selected → step cards/diagram/temperature review; timer subflows | cook-mode-ui and cooking-core | do not invent safety reviews |
| S15 | kitchen weigh-in edited → evaluated → persisted/pending dual review | weighin-ui/core + canonical state | failed storage must not display saved |
| S16 | service worker install/activate/cache-first → cache update | service-worker.js, Cache Storage | stale HTML/JS when cache version unchanged |
| S17 | initial fixture missing → bounded retries (~10s) → error/retry | index.html boot2 | startup failed vs success ambiguous |
| S18 | PR checks → Pages deploy → postdeploy smoke → scheduled R3 drift | GitHub Actions | failure logs lost by illegal artifact filename |
| S19 | nutritional status unverified → weighed-pending-review → dual-review needed | nutrition provenance | avoid unsupported certified macro claims |
| S20 | first-run onboarding choices | **not implemented**; defaults in StorageCore | no actual wizard or user-edited month grid |

## State diagrams

~~~mermaid
stateDiagram-v2
  [*] --> Booting
  Booting --> WaitingForModules: fetch fixtures + deferred scripts
  WaitingForModules --> Booting: bounded retry
  WaitingForModules --> Hydrating: modules ready
  WaitingForModules --> Failed: timeout
  Hydrating --> Ready: checksum + schema valid
  Hydrating --> Failed: corrupt/unsupported/denied storage
  Failed --> Booting: explicit retry
  Ready --> [*]
~~~

~~~mermaid
stateDiagram-v2
  [*] --> CurrentPlan
  CurrentPlan --> Draft: add/copy/move/delete/repeat/weigh
  Draft --> Refused: invalid entry, stale checksum, quota, denied storage
  Refused --> CurrentPlan: discard draft, preserve original
  Draft --> Committed: validate + write succeeds
  Committed --> CurrentPlan: update SAME shared model and rerender
  CurrentPlan --> Imported: valid other-tab storage event
  Imported --> CurrentPlan: refresh all canonical projections
~~~

~~~mermaid
flowchart LR
  User["User selects recipe, date, portion"] --> Check{"Valid PlanEntry?"}
  Check -- no --> Refuse["Show error; preserve plan"]
  Check -- yes --> Commit{"Persist draft?"}
  Commit -- no --> Refuse
  Commit -- yes --> Canonical["Canonical planEntries"]
  Canonical --> Planner["Planner list / repeat family"]
  Canonical --> Shopping["Computed shopping for date range"]
  Canonical -. no direct mapping .-> Editorial["Static legacy calendar/week/day"]
  Canonical -. no direct mapping .-> Nutrition["Separate nutrition sample"]
~~~

## First-run and cross-page walkthrough acceptance matrix
After EACH mutation, visit Dashboard, Calendar, Week, Day, Recipes, legacy Shopping, Nutrition, Planner, Shopping Engine, Cooking and Weigh-in, then return and reload. Compare visible record IDs/dates, counts, selected week/date, recipe links and saved state. Use real browser clicks (not source-string tests) and fresh localStorage contexts.

| Operation | Expected canonical Planner | Expected computed Shopping | Other pages |
|---|---|---|---|
| Fresh origin | empty PlanEntries | empty list | sample pages visibly labeled sample |
| Add 1 dated dinner | 1 new valid id and date | ingredients ONLY within selected range | editorial views must not claim updated |
| Add two distinct recipes same date | 2 distinct entries | both recipe contributions | no collapse by date |
| Move date across week/month | id remains, date changes | old range loses, new range gains quantities | use local calendar dates |
| Copy entry | new id, both entries remain | destination demand increases | original unchanged |
| Repeat 4 weeks | deterministic repeat family/observed dates | range-based totals include each | second identical repeat adds zero |
| Delete last entry | disappears | zero matching demand | stale tab cannot silently overwrite |
| Storage quota/read denial | error, no phantom success | old projection unchanged | stored bytes preserved |
| Corrupt but checksummed entry | fail closed | no overwrite | diagnostic shows code |
| Other tab edits | updated model after storage event | refilter/list recompute | no cross-device claim |
| Language switch | same plan IDs/dates | same quantities | safety copy checked |
| Offline/reload | cached shell when previously installed | unchanged plan | CDN first-load offline NOT guaranteed |

**Not implemented:** editable day/week/month calendar synchronized with canonical storage; a true first-time setup wizard; cross-device/simultaneous editing server.

## Root-cause ledger and status
- **R01 P0 CI artifact upload:** failed scheduled R3 on Nov 22 2026: e2e failed, and uploader rejected r3_boot:regression.log because colon is invalid. Fix: portable log name and seeded fake-npm negative tests, allowing actual E2E log to survive. **CI validation pending**.
- **R02 P1 malformed JSON:** previously JSON null/array or denied reads could throw; checksum-valid invalid plan could hydrate. Fix: schema guard + error preserving raw bytes; targeted negative tests.
- **R03 P1 phantom save:** previously plan mutated before unchecked localStorage save. Fix: StorageCore.transact draft/commit-or-rollback across shopping/planner/weigh-in and full-week generation; failure injection tests.
- **R04 P1 split-brain calendar:** three parallel planners. Mitigation: conspicuous sample labels and links. **Unified planner OPEN**.
- **R05 P1 cross-tab conflicts:** known stale checksum detection and external storage event update; **TOCTOU race OPEN** since localStorage has no atomic compare-and-swap.
- **R06 P1 mergeStates union resurrection:** deletes can be resurrected by union-by-id snapshot merge. Not used in candidate transaction; future tombstones or versioned writes needed. **OPEN**.
- **R07 P1 cache-first SW drift:** bump CACHE_NAME for changed deployment and verify postdeploy SHA asset parity; CDN assets not precached. **PENDING RELEASE GATE**.
- **R08 P2 tautological test:** planner tested Date.parse === Date.parse; replaced with date/recipe observable invariants.
- **R09 P2 E2E flakiness:** uses fixed waits and CDNs. **Cause of underlying E2E failure UNKNOWN until logs from next workflow**.
- **R10 P2 onboarding/unified monthly grid:** not implemented, remains explicit backlog.

## Four mandatory red-team rounds
**RT1 — state inventory:** vary routes/data source and compare editorial versus canonical; a page that falsely claims linked calendar must fail. Current label mitigation, full harmonization OPEN.
**RT2 — persistence adversary:** malformed null/arrays/scalars, rechecksummed bad fields/duplicate IDs, storage reads/backup failures; tests must refuse without data loss, not merely recompute the same checksum.
**RT3 — mutation/concurrency:** quota failure, invalid second entry of a week, stale second tab, repeated rule; tests must show observable rollback and prevent phantom shopping demand.
**RT4 — release drift:** fake npm layer fails, verify nonzero gate and diagnostics; reject illegal artifact names, check new SW cache version, asset parity, mobile/i18n and source drift. Open CI evidence remains OPEN, not manufactured.

## Engineering patterns / explicit trade-offs
- **No connection pooling or outbox**: static Pages frontend has no database, backend, message broker or remote write pipeline. These patterns solve different problems; adding them would be architecture theater.
- **Optimistic checksum** cheaply catches known stale snapshots, but does not provide transactional cross-tab serialization; if two writes read same checksum simultaneously, last writer can still win. For strong multi-tab editing, use Web Locks plus IndexedDB transactions; for multi-device consistency use versioned backend APIs and proper reconciliation.
- **Do not merge deleted rows by naive union**, do not auto-import unstructured recipe strings into structured PlanEntries; prefer visible conflict to loss.
- **Release requires real browser runs**: unit tests for math, independent browser checks for navigation, storage reload, cross-tab storage, SW update, offline and a11y.
- **Privacy**: all GitHub Pages assets are public; never expose data/private or context/private; source/editorial food-science caveats preserved.

Sources: MDN https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event , MDN https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API , web.dev https://web.dev/learn/pwa/serving , Plan to Eat product description https://play.google.com/store/apps/details?id=com.plantoeat.mobile (marketing description, not independent user study).

## Release rule
For every task and each of four red-team passes: prove a regression with falsifiable RED→GREEN or seeded-negative checks, document commands/observed results and remaining risks. Run npm run chore(lint), npm test, npm run check, npm run privacy, npm run e2e, npm run staging and npm run r3 in CI. Do not merge/deploy until failure evidence and release safeguards are satisfactory.
