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

## 2026-10-31 OWNER DECREE (verbatim authorization)

> "the atlas and no information in the context or context information folders is private. we decree it"

Consequences recorded by the assistant:
- `context/` + `Context information/` contents (incl. `2026-05-01-2026-10-26-flavor-profile-analysis.json`, the artifact bundle, and `context/generated/flavor-atlas-v1.json`) are PUBLIC at owner discretion; the aggregate-only safeguards remain in code as defense-in-depth but no longer block publication.
- `data/private/` (owner originals incl. the XLSX + PDF) was NOT included in this decree and stays gitignored/private.
- `context/private/` stays reserved-private until a reviewed file is placed there (future private drops).
- Trade-off stated: the 4.3MB analysis JSON + bundle get committed (repo weight; servable at owner request); the flavor UI auto-loads the SMALL generated atlas; the big bundle is NOT auto-served by the app (not needed) but can be published on request.

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

| TPCA composition DB (official) | `tablasperuanas.ins.gob.pe` INS food DB (1125 foods; 14 groups; per-100g kcal/kJ/protein/fat/carb/fiber/micronutrients; also cooked preparation DB per INEI) | PUBLIC OFFICIAL (Instituto Nacional de Salud) | 11a ed. 2023 (Reyes-García et al.); v2023 rows visible
| TPCA composition PDF (official) | `repositorio.ins.gob.pe` tpca-2025-2.pdf (5.3 MB) — 11va ed. versión digital 2023 | PUBLIC OFFICIAL | handle 20.500.14196/1773
