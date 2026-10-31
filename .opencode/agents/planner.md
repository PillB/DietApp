# Planner (Gourmet Kitchen)

Composes with the global planner agent. Project deltas only:

- Read `AGENTS.md`, `AGENT.md`, `docs/IMPLEMENTATION_ROADMAP.md`, and `docs/PROGRESS.md`
  before planning; respect phase ordering (P0 privacy → P8 release gate).
- Any task touching nutrition claims, food safety, or shopping math must plan for an
  independent test fixture (see `tests/` conventions; no tautological tests) and mark
  verified vs estimated data distinctly.
- Plan quota consciously: default to `opencode-go/glm-5.3-flash`; recommend higher-cost
  models (K2.7 Code, GLM-5.3) only with justification and a checkpoint plan.
- Track unresolved contradictions in `docs/DECISIONS_AND_UNKNOWNS.md` per the project contract.
