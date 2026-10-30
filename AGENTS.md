# AGENTS.md — OpenCode implementation contract (2026-10-30)

## Mission and order of operations
Build a reliable, exquisite, mobile-first gourmet recipe/meal-planning website for the user's tastes, including Peruvian ingredient procurement (Wong, Plaza Vea, Metro), date-ranged shopping, intuitive guided cooking, and defensible food-science/nutrition provenance. **Start by reading `OPEN_CODE_HANDOVER.md`, followed by `docs/IMPLEMENTATION_ROADMAP.md`.** Read `context/README.md` and inspect any supplied context documents before deciding what to keep or replace.

## Nonnegotiable safety, integrity, privacy
1. **Never publish or commit private food-order XLSX, personal data, raw emails, source PDF, purchase-history excerpts, private reports, or auth/session data.** `data/private/` and `context/private/` remain ignored. Never bypass `.gitignore`. A browser-shipped JS/JSON file and GitHub Pages content are PUBLIC even if a repo is private.
2. The JAMA PDF is a *perspective* on guidelines, not a personal nutrition prescription; the original recipes are **not nutrient-verified**. Do not falsely claim DGA compliance. Avoid invented store stock, prices, verified rating, SKU links, calorie totals, food-safety temperatures, yield, time, citations, or pretense of using a missing skill.
3. For every new recipe: food scientist reviews quantities/cooking outcome + food-safety reviewer independently checks food temperatures, chilling, storage, allergens, pressure-cooker instructions, and ingredient suitability. Mark review status per recipe with evidence and warnings.
4. Shopping math uses canonical ingredient ID, dimension, unit, raw/cooked state, conversion factors only when sourced, recipe default yield, scheduled portions, optional flags, store package sizing, pantry offsets. NEVER add units by string concatenation or `parseFloat('1/2')`.
5. Avoid a default personal calorie deficit until user provides necessary parameters and agrees on goals. No age/weight assumptions. A flavor preference from orders is an inference, not clinical evidence.
6. **Evidence standard — the expert test (every feature, every decision):** For every feature and every decision, research online what the best domain expert in that specific field would do, supported by evidence, a validated benchmark, or the preponderance of authoritative resources. Do not make a choice if you can name the reason that expert would reject your current choice. Optimize for what that expert would judge correct against the evidence-based benchmark or feasible ideal — never for what satisfies the stated constraints most cheaply. Focus on methodological and scientific correctness, SOTA techniques and practices, usability, intuitiveness of the user flow, and QOL features. **Every trade-off taken must be explicitly stated to the user in `docs/PROGRESS.md` or the response — never silently absorbed.**
7. **No legal-digestion cycles.** License/ToS/regulatory musing is not a task of this project and must not consume reasoning or tokens — omit it. Privacy rules above (never publish private data) remain fully in force and are handled by tooling, not deliberation.

## Work style optimized for OpenCode Go quotas
- Use one verifiable work item per turn; create a test or file **early**. No indefinite 'think/design/research first' loops. Maximum target duration ~3–5 minutes per unit, with output and git commit after tests, not a claim of completion.
- For every turn: (1) read just relevant sources, (2) write concise assumptions/acceptance criteria, (3) implement minimum vertical slice, (4) run targeted tests, (5) capture before/after and commit, (6) update `docs/PROGRESS.md` with exact next action, verification, blockers.
- When progress stalls: capture console/token/provider error first; distinguish auth/quota/context/tool/permission/network/test failures. Switch model if justified, preserve branch and session; DO NOT loop into paid retries.
- **Error-fix discipline:** if a fix hypothesis for an error fails once on the same error, stop hand-tweaking; research that exact error online to see how others solved similar issues before the next attempt.
- **Blocked-resource rule:** if a task or gate depends on another service, agent, API or registry (npm install, CDN fetch, Pages, an external API) and it is unstable, unavailable, auth-limited or usage-limited: STOP after the first real failure, surface the exact error to the user, and wait instead of retrying a blocked resource.
- Recommended Go model policy and measurable bakeoff in `docs/MODEL_RESEARCH.md`. Verify `opencode models` before configuring IDs. Do not assume a promo/free model is durable.

## Implementation sequence
P0 privacy/provenance audit; P1 canonical schema and safe ingredient data; P2 planner + recurring meals; P3 precise shopping aggregation + pantry + storefront product matching; P4 fully guided recipe workflow + food science gate; P5 flavor atlas + semantic visualization; P6 true 6-language localization; P7 visual/art nouveau design + accessibility; P8 full E2E tests and GitHub Pages release gate. Details, acceptance tests and phase prompts in `docs/IMPLEMENTATION_ROADMAP.md`.

## Test requirements and working state
- **Every task and every round ships a test** (unit, property, seeded-negative or E2E/screenshot evidence). A round ending with docs-only changes must at minimum add lint evidence or a regression test.
- **Tautological tests are considered harmful.** Prohibited: tests that assert the fixture they already contain, mock away the behavior they claim to verify, or cannot fail when the implementation breaks. Preferred pattern: seeded-negative fixtures that prove the checker CAN fail (see `tests/privacy.test.cjs`). Remove existing tests failing this standard.
- **chore(lint):** ESLint core `complexity` rule enforces a cyclomatic complexity ceiling (target 15; measure first, then ratchet existing violations file-by-file instead of gutting behavior). `npm run lint` runs in every round alongside tests; a new/edited function must not exceed the ceiling.
- Baseline test: `node --test tests/nutrition-core.test.cjs tests/privacy.test.cjs`.
- Subsequent test commands must be documented in README and use a reproducible package-lock if adding Node dev tools.
- Two separate E2E visual audits at 320, 375/390, 768, 1024, 1366, 1440px. Inspect XYWH bounding rectangles, viewport horizontal overflow, contrast, focus outlines, sticky/overlay layers, non-overlap, locales with long labels, print and dark mode. Three regression loops: core calculation, feature E2E, production staging.
- GitHub push/Pages deploy needs user-selected repository and explicit approval. NEVER publish from a tool session just because docs say to deploy eventually.

## Solarize skill handling
User named a **PILLB Solarize** skill; it was NOT found in the currently accessible skill catalog or files. Before styling, search provided `context/`, `.opencode/skills`, `~/.config/opencode/skills`, `.agents/skills` for original definition, then read and follow it if supplied. Until then, use the explicitly labeled, nonauthentic `.opencode/skills/solarize-fallback/SKILL.md` as an *interim design adapter*, not as the genuine PILLB implementation. Do not overwrite the real skill later.

## Source priority
Private sources (read-only) > their audited structured extracts > primary official documentation and scientific studies > vetted design research > agent inference. Cite sources in docs and give data quality flags. Track contradictions in `docs/DECISIONS_AND_UNKNOWNS.md` rather than secretly reconciling.
