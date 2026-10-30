# Handover source inventory (metadata only)

| Artifact | Location | Confidentiality | Status |
|---|---|---|---|
| 2026-10-26 baseline v3 source | `index.html`, `assets/`, `tests/` | Public-code candidate, needs audit | Included |
| Personal order workbook | `data/private/food_delivery_orders_extracted(2).xlsx` | PRIVATE | Included locally, gitignored |
| JAMA dietary commentary | `data/private/dariush-mozaffarian-the-2025-2030-dietary-guidelines.pdf` | Private/source copyright | Included locally, gitignored |
| Earlier long-form menu/report | `data/private/report.md` | PRIVATE | Included locally, gitignored |
| Legacy recipe/menu data | `meal-plan-data.json`, `assets/js/data.js` | Public only after deidentification/QA | Included; NOT fully nutrition-verified |
| Weighed illustrative recipes | `nutrition-reviewed.json`, `assets/js/nutrition-data.js` | Public-code candidate | Included; NOT kitchen-verified |
| Future context | `context/private/` | PRIVATE until reviewed | Not yet supplied |
| Real PILLB Solarize skill | Unknown/needs supplied file | License unknown | NOT FOUND |

The original workbook may contain email indices, timestamps, prices, descriptions or raw text excerpts. Do not publish it. Neither source PDF nor generated report should be copied into a public GitHub Pages folder without a separate privacy decision.

## P0.2 hash audit — 2026-10-30 (metadata only; full data: `docs/source-inventory.json`, schema `source-inventory/v1`)

Verified in-session by `scripts/inventory_sources.py` (SHA-256, sizes, media types, git-tracked check) with `tests/source_inventory.test.cjs` (seeded-negative fixture proof).

| Artifact (all untracked) | Bytes | SHA-256 (first 12) | Note |
|---|---|---|---|
| `data/private/food_delivery_orders_extracted(2).xlsx` | 319,086 | `f43ff8d668ec` | owner original |
| `data/private/dariush-mozaffarian-the-2025-2030-dietary-guidelines.pdf` | 67,284 | `5dbb15a4d09a` | owner original |
| `data/private/report.md` | 84,509 | `1657c57366fb` | owner original |
| `context/2026-05-01-…-flavor-profile-analysis/` (dir, 39 files + `artifact-manifest.json`) | — | see JSON | user drop: `website_prototype.zip`, generated PNGs, NUTRITION_RESEARCH_2026.md… |
| `context/2026-05-01-…-flavor-profile-analysis.json` | 4,379,327 | in JSON | order-derived analysis, unreviewed |
| `Context information/…` (dir 39 + 1 json) | — | in JSON | byte-identical second copy of the same drop |

Key audit findings (root causes/problems identified):
1. **83 private/untracked artifacts**; **zero git-tracked private files** (tooling-verified, not assumed).
2. The user drop **fully duplicates all three `data/private/` originals byte-for-byte** and exists twice (`context/` and `Context information/`). Redundant triple storage → recommend user keep one canonical copy; until decided, both stay gitignored.
3. `context/…/artifacts/generated/NUTRITION_RESEARCH_2026.md` is byte-identical to the *tracked public* repo root `NUTRITION_RESEARCH.md` (`6f722d40e79f…`) — the content is already public in the repo and scans clean (no emails/private paths/mobile numbers) via the P0.1 scanner, so it may remain tracked, but its status stays flagged as generated nutrition research NOT independently verified.
4. The drop reveals the true v3 SPA source: `artifacts/derived/website_prototype.zip` (`08cea0efa09f…`) — P0.3 baseline should confirm whether the repo's index.html/assets match that prototype or supersede it.
5. "Later generated report" hypothesis confirmed: `data/private/report.md` ≡ drop's `artifacts/derived/report.md` — one derived artifact, three copies.
