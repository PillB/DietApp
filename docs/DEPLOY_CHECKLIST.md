# Pages deploy-gate checklist (AGENTS.md §publish + §11)

**Status: NOT authorized yet — every row must be owner-confirmed before `git push`.**

## Gate 1 — owner decisions (NOT met yet)
| # | Requirement | Status |
|---|---|---|
| 1 | Target GitHub repository / account URL | ⬜ pending (owner must supply: e.g. `github.com/<you>/diet-app`) |
| 2 | Full authorization statement (a quoted consent to push + enable Pages) | ⬜ pending |
| 3 | Confirm which of `context/` + `Context information/` go to the PUBLIC repo (the 2026-10-31 decree puts them public in-repo, but the owner may further restrict specific bundles at push time) | ⬜ pending |

## Gate 2 — artifacts readiness (met)
| Check | Evidence |
|---|---|
| `data/private/` gitignored (all 6 files) | `.gitignore` + staging sweep |
| `context/private/` reserved-private | same |
| Service-worker cache version | `service-worker.js` in repo root (pending: version-bump each deploy) |
| Privacy leak scan | `node scripts/privacy_check.cjs` → PASS (16 public build files) |
| Composition audit | `tests/composition_audit.test.cjs` PASS (0 drift) |
| Full unit suite | 142 pass / 0 fail |
| E2E 6 flows | shopping / planner / cook / flavor — ALL PASS |
| Staging QA (8 gates) | `npm run staging` PASS |
| Lint / CC ceiling | `npx eslint .` clean; current CC ≤ 12 for new code |
| Ledger open items | LEDGER-1c (TPCA population), LEDGER-2 (owner weigh-in), LEDGER-3 (composition rows ~57/60) — all NOT deployment blockers per the snack-by-snack privacy floor |

## Gate 3 — after-push preparations (not to run until approval)
1. `npm run check` final pass
2. `node tests/staging_qa.cjs` re-run against the GitHub Pages HTTPS URL
3. Confirm relative asset URLs work (pages use relative paths already)
4. Confirm the service-worker DOES NOT cache stale content across versions

## Gate 4 — post-deploy
1. Verify reachable from a mobile 3G/4G connection
2. Run `tests/e2e_served.cjs` against the live Pages HTTPS URL (port param—currently hard-coded, will be updated if the owner wants an extra E2E)
3. Report commit SHA + final URL + IW in a RELEASE_REPORT alongside docs/PROGRESS.md
