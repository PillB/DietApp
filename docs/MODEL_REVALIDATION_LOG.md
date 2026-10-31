# Model revalidation log — Gourmet Kitchen (DietApp)

Mirror of the global log (`~/.config/opencode/model-routing/revalidation-log.md`) with project impact.

| Timestamp (UTC) | Trigger | Result | Project impact |
|---|---|---|---|
| 2026-10-30T23:52Z | Initial configuration (fresh discovery + 3 passes) | Policy g1.1.0 global + project config created; primary `opencode-go/glm-5.3-flash`; deltas vs `docs/MODEL_RESEARCH.md`: K3.1 Pro added (Go), DeepSeek V4 Flash deprecated, MiMo reliability bug found, per-model privacy rows recorded. 3 passes: (1) catalog/eligibility cross-check done; (2) capability/reliability evidence done (targeted, since prior memo survey is 0 days old); (3) expert-rejection review done (see MODEL_SELECTION_DECISION). | Project `opencode.json` created; `config/model-routing.policy.json` created; routing tests added and green; AGENTS.md updated with pointer. DeepSeek deferred pending region-permission verification. |
