# OpenCode Go handover — start here

This is a **research, implementation and QA handover added to the existing v3 Gourmet Planner baseline**, not a claim that the entire new website is built, retailer inventory connected, recipes kitchen-validated, or GitHub deployed.

## First run (local)

```bash
cd gourmet-meal-plan-spa
python scripts/check_handover.py
node --test tests/nutrition-core.test.cjs
# Connect your Go key if needed via the OpenCode terminal `/connect`.
opencode models
opencode
# Then type: /kickoff
```

Read the root `AGENTS.md` then `OPEN_CODE_HANDOVER.md` in that order. `AGENTS.md` is auto-read by OpenCode per official project instructions. Check one ticket off at a time; write tests and code before expensive deliberation. Record progress in `docs/PROGRESS.md`.

**PILLB Solarize skill:** not present in the current environment, so a transparently labeled `solarize-fallback` original adapter is included. If user supplies authentic file in `context/`, use that instead.

**Repository privacy:** `data/private/` contains original personal food-order histories and source PDF/report. Their Git exclusion is essential. It is safe to distribute this ZIP to the owner locally, but **do not upload whole ZIP contents to a public repo**, don't `git add -f` private files and don't put raw data in browser code. Some legacy non-private recipe JSON still may contain personal flavor inferences; review before publishing.

**No current deployment** was attempted; for real GitHub Pages, choose repository and explicitly authorize publication; see `docs/QA_RELEASE.md`.
