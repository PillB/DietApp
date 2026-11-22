# DietApp — Runtime, storage, workers, deployment and QA inventory
**As inspected:** 2026-11-22, America/Lima. Baseline main SHA bea506642117920fbe3bfdae0529d7e9230b7871.

## Production map (verified from repository and Actions metadata, not an infrastructure access audit)
| System | Confirmed location / responsibility | Status and caveat |
|---|---|---|
| Source repository | https://github.com/PillB/DietApp (public), default main | Current candidate in audit/state-machines-2026-11-22 |
| Hosted site | https://pillb.github.io/DietApp/ (configured in tests/deployed_asset_parity.cjs) | Last known Pages deploy successful Nov 6; verify new deployment before claiming live |
| Frontend | root index.html; assets/js/app.js, planner-ui.js, shopping-ui.js, nutrition-ui.js, cook-mode-ui.js; assets/css | HTML/CSS/JS + Alpine and Tailwind CDN; no app backend |
| Canonical meal database | Each visitor's browser localStorage key pgk-state-v1 | Local to browser profile/origin, checksummed JSON; **not** multi-device sync or server database |
| Nutrition sample DB | Browser localStorage key gourmet-nutrition-schedule-v1 | Separate prototype, NOT canonical |
| Legacy shopper checks | Browser localStorage gourmet-shopping-checks | Separate from planner |
| Canonical shopper checks | Browser localStorage pgk:shopper-checked:v1 | Separate checklist state |
| Browser cache | service-worker.js; browser Cache Storage dietapp-v5-20261106 baseline | Cache first for static app shell; cache version must change with deployment |
| Runtime workers | Browser service worker only; ephemeral GitHub Actions runners for CI | No app backend workers, no message broker, no connection pool or background compute server found |
| External dependencies | Alpine.js and Tailwind CDN in index.html; static JSON fixtures under data/canonical, data/reference, data/fixtures | First-visit/offline behavior depends on CDN availability |
| Reference/source docs | docs/ directory, AGENTS.md, AGENT.md, agent.md (candidate), CLAUDE.md, OPEN_CODE_HANDOVER.md | Private source documents must never reach public Pages |
| CI | .github/workflows/pr-quality.yml, weekly-r3-gate.yml, post-deploy-pages-smoke.yml | Latest scheduled R3 run Nov 22 failed; E2E failed and upload-artifact discarded logs due colon |
| Browser QA | tests/e2e_served.cjs, tests/staging_qa.cjs, tests/release_regression.sh, tests/deployed_asset_parity.cjs | Candidate browser evidence must come from PR workflows |
| Security/privacy | .gitignore + scripts/privacy_check.cjs; data/private and context/private excluded | Public repo / public static web assets; never publish originals |
| Analytics, database host, API gateway, queue | No service or connection config evidenced in source | Do not invent infrastructure or deploy backend |

## Topology

~~~mermaid
flowchart LR
  GH["GitHub public repo: PillB/DietApp"] --> CI["Actions CI runners<br/>transient, per workflow"]
  GH --> PAGES["GitHub Pages static HTTPS site"]
  PAGES --> BROWSER["User browser: Alpine+Vanilla SPA"]
  CDN["Tailwind / Alpine CDN"] --> BROWSER
  BROWSER <--> LS["localStorage<br/>pgk-state-v1 and sample stores"]
  BROWSER <--> SW["Service Worker<br/>Cache Storage, offline shell"]
  CI --> PARITY["Compare deployed asset SHA256<br/>to checked-out commit"]
~~~

## Operational commands (candidate and PR)
- npm ci
- npm run chore(lint) — ESLint complexity ceiling 15 normal functions; legacy assets/js/data.js 25; documented ratchet
- npm test — pure math/domain/storage/recipe + planted negative-control tests
- npm run privacy — public data leak scan
- npm run check — lint, tests, privacy, handover
- npm run e2e — Chromium on served local HTTP origin
- npm run staging, npm run r3 — layered browser/geometry/checks
- node tests/deployed_asset_parity.cjs — compare deployed HTML/JS/data bytes with current commit

## Deployment, diagnostics and failure class mapping
- **Build failure:** GitHub Pages build run unsuccessful; do not assume new content published.
- **Layer failure:** scheduled R3 failed E2E on Nov 22; exact layer stderr unavailable because upload-artifact also failed. Candidate changes fix log naming so future runs can expose true root cause.
- **Cache drift:** bump service-worker.js CACHE_NAME and verify fresh/repeat visitors load new assets.
- **Stale tab:** StorageCore.transact refuses a known changed checksum; browser storage event refreshes other tabs. Simultaneous writes remain unprotected without Web Locks / IndexedDB transaction.
- **Privacy issue:** stop deploy and inspect public artifacts / git history, not only current .gitignore.
- **Menu drift:** distinguish static editorial views and nutrition sample from canonical Planner/Shopping. This is a product migration, not a cache issue.

## Repo deployment safeguard
Do not merge on red PR CI. After green: merge only the reviewed branch; verify main Pages build **AND** post-deploy smoke, then asset hashes / live browser navigation. Report exact commit, run IDs and unresolved risks. No automatic workers to reuse were discovered in source; GitHub Actions runners are ephemeral and cannot be repurposed.
