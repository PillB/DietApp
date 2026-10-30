# AGENTS.md — OpenCode implementation contract (2026-10-30)

## Mission and order of operations
Build a reliable, exquisite, mobile-first gourmet recipe/meal-planning website for the user's tastes, including Peruvian ingredient procurement (Wong, Plaza Vea, Metro), date-ranged shopping, intuitive guided cooking, and defensible food-science/nutrition provenance. **Start by reading `OPEN_CODE_HANDOVER.md`, followed by `docs/IMPLEMENTATION_ROADMAP.md`.** Read `context/README.md` and inspect any supplied context documents before deciding what to keep or replace.

## Nonnegotiable safety, integrity, privacy
1. **Never publish or commit private food-order XLSX, personal data, raw emails, source PDF, purchase-history excerpts, private reports, or auth/session data.** `data/private/` and `context/private/` remain ignored. Never bypass `.gitignore`. A browser-shipped JS/JSON file and GitHub Pages content are PUBLIC even if a repo is private.
2. The JAMA PDF is a *perspective* on guidelines, not a personal nutrition prescription; the original recipes are **not nutrient-verified**. Do not falsely claim DGA compliance. Avoid invented store stock, prices, verified rating, SKU links, calorie totals, food-safety temperatures, yield, time, citations, or pretense of using a missing skill.
3. For every new recipe: food scientist reviews quantities/cooking outcome + food-safety reviewer independently checks food temperatures, chilling, storage, allergens, pressure-cooker instructions, and ingredient suitability. Mark review status per recipe with evidence and warnings.
4. Shopping math uses canonical ingredient ID, dimension, unit, raw/cooked state, conversion factors only when sourced, recipe default yield, scheduled portions, optional flags, store package sizing, pantry offsets. NEVER add units by string concatenation or `parseFloat('1/2')`.
5. Avoid a default personal calorie deficit until user provides necessary parameters and agrees on goals. No age/weight assumptions. A flavor preference from orders is an inference, not clinical evidence.

## Work style optimized for OpenCode Go quotas
- Use one verifiable work item per turn; create a test or file **early**. No indefinite 'think/design/research first' loops. Maximum target duration ~3–5 minutes per unit, with output and git commit after tests, not a claim of completion.
- For every turn: (1) read just relevant sources, (2) write concise assumptions/acceptance criteria, (3) implement minimum vertical slice, (4) run targeted tests, (5) capture before/after and commit, (6) update `docs/PROGRESS.md` with exact next action, verification, blockers.
- When progress stalls: capture console/token/provider error first; distinguish auth/quota/context/tool/permission/network/test failures. Switch model if justified, preserve branch and session; DO NOT loop into paid retries.
- Recommended Go model policy and measurable bakeoff in `docs/MODEL_RESEARCH.md`. Verify `opencode models` before configuring IDs. Do not assume a promo/free model is durable.

## Implementation sequence
P0 privacy/provenance audit; P1 canonical schema and safe ingredient data; P2 planner + recurring meals; P3 precise shopping aggregation + pantry + storefront product matching; P4 fully guided recipe workflow + food science gate; P5 flavor atlas + semantic visualization; P6 true 6-language localization; P7 visual/art nouveau design + accessibility; P8 full E2E tests and GitHub Pages release gate. Details, acceptance tests and phase prompts in `docs/IMPLEMENTATION_ROADMAP.md`.

## Test requirements and working state
- Baseline test: `node --test tests/nutrition-core.test.cjs` (only limited subset; see QA_REPORT.md).
- Subsequent test commands must be documented in README and use a reproducible package-lock if adding Node dev tools.
- Two separate E2E visual audits at 320, 375/390, 768, 1024, 1366, 1440px. Inspect XYWH bounding rectangles, viewport horizontal overflow, contrast, focus outlines, sticky/overlay layers, non-overlap, locales with long labels, print and dark mode. Three regression loops: core calculation, feature E2E, production staging.
- GitHub push/Pages deploy needs user-selected repository and explicit approval. NEVER publish from a tool session just because docs say to deploy eventually.

## Solarize skill handling
User named a **PILLB Solarize** skill; it was NOT found in the currently accessible skill catalog or files. Before styling, search provided `context/`, `.opencode/skills`, `~/.config/opencode/skills`, `.agents/skills` for original definition, then read and follow it if supplied. Until then, use the explicitly labeled, nonauthentic `.opencode/skills/solarize-fallback/SKILL.md` as an *interim design adapter*, not as the genuine PILLB implementation. Do not overwrite the real skill later.

## Source priority
Private sources (read-only) > their audited structured extracts > primary official documentation and scientific studies > vetted design research > agent inference. Cite sources in docs and give data quality flags. Track contradictions in `docs/DECISIONS_AND_UNKNOWNS.md` rather than secretly reconciling.
