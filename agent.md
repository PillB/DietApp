# agent.md — canonical engineering execution and testing contract
**Path:** repository root /agent.md. Read together with AGENTS.md, AGENT.md, CLAUDE.md, OPEN_CODE_HANDOVER.md and docs/STATE_MACHINES_2026-11-22.md.

## Non-negotiable expert decision standard
For EVERY feature and EVERY decision, identify the relevant recognized domain expertise and evidence (primary source, technical standard, sound experimental result or preponderance of credible research). Ask whether an expert would reject the proposed choice and why; if a material justified objection remains, do NOT silently make that choice. Compare alternative architectures and validate before implementing. Prefer methodological/scientific correctness, robust state invariants, informed UX, accessibility and intuitive first-run flows over cheapest compliance. Explicitly write EVERY accepted trade-off, residual risk, uncertainty and rejected alternative to docs/ISSUES_LEDGER.md and the response. Do not invent expert evidence, store stock, nutrient verification, user preference or backend existence.

## Executable task / round contract
At the start of EVERY task: inspect code, user flow, owners and invariants; name a reproducible failure hypothesis and acceptance criterion. Write/adjust a falsifiable test that checks observable behavior rather than implementation text. For every cycle, perform: (1) pre-execution alternatives and risk predictions, (2) negative control or RED test proving it can fail, (3) minimum safe fix, (4) GREEN regression plus surrounding integration, (5) four independent red-team rounds (state coherence, invalid/unsafe input, concurrency/failure injection, user journey/deploy/source drift), (6) write exact commands, PASS/FAIL/SKIP, trace and trade-offs. Never close a ledger issue without root cause, reproduction, new test and recheck. If CI or a service is unavailable mark UNKNOWN, not PASS.

## Four-round adversarial evidence checklist
- R1: navigate every related page after each mutation; detect contradictory or stale representations.
- R2: corrupt schema/JSON, invalid dates/fractions/units/portions and deny storage; preserve original data.
- R3: inject partial writes, quota limits, duplicate IDs, concurrent tabs, cancellation/repeats and reloads.
- R4: test mobile/keyboard/a11y, build/deploy/cache drift, dead/failed services, source drift and public privacy scan.

## Tautological tests considered harmful
NEVER write x===x / Date.parse===Date.parse / literal source-string self-tests as acceptance. Vary inputs or inject a known fault and check externally visible outcomes and preserved bytes. Test must fail if the relevant safety rule is removed. Use independent assertions (e.g., shopping quantity changes when plan is moved outside the selected range) and a negative control.

## Mandatory complexity and lint gate
Run **npm run chore(lint)** (alias of ESLint). ESLint enforces cyclomatic complexity 15 in normal JS; one measured legacy-only exception assets/js/data.js currently has threshold 25. No blanket disables, no ceiling escalation to pass changes, and no new exception without explicit documented measurements and a planned ratchet. Run npm test, npm run privacy, npm run check and browser CI. Each task/round adds an appropriate real test—not merely a chore script.

## State architecture
Use one canonical plan state (pgk-state-v1) for editable Planner and Shopping Engine. Legacy editorial calendar/day/week and Nutrition schedule are currently NOT synchronized; disclose distinctly and never pretend to merge vague names or portions. Preserve state raw bytes on errors, reject checksum-valid invalid schemas, draft/commit before displaying success, detect stale tabs and listen for same-origin storage events. localStorage is not atomic compare-and-swap: do not claim strict isolation. Web Locks/IndexedDB only when justified; outbox/connection pooling only with a real backend.

## Release gates
Do not merge a PR with red/missing CI. Run local browser + PR branch tests and document outcomes before declaring production-ready. To deploy, bump service worker cache, check Pages build, confirm served asset hashes and postdeploy browser smoke. Never publish data/private or context/private; PUBLIC Github Pages files and in-repo context must be privacy-scanned. Consult docs/STACK_TOPOLOGY_2026-11-22.md and docs/STATE_MACHINES_2026-11-22.md for active design limitations.
