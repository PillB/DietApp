# Model evidence register — Gourmet Kitchen

Freshness: 2026-10-30. Hierarchy of authority (highest first): account-verified behavior →
official provider terms → reproducible independent benchmarks → credible user reports →
vendor claims → speculation. Every entry carries date + source + confidence + where it was used.

| # | Claim | Source | Date | Kind | Confidence | Used in |
|---|---|---|---|---|---|---|
| E1 | Active session runs `opencode-go/glm-5.3-flash` with functioning tool use (reads, shell, edits, tests, web) | This session, OpenCode Desktop | 2026-10-30 | Account-verified behavior | high | MODEL_SELECTION_DECISION §1, global AGENTS.md |
| E2 | Go catalog, prices, limits, request estimates (GLM-5.3-Flash 6,320 req/5h/$60 mo; DeepSeek V4.1 Flash 43,330/$100; MiMo-V2.6-Flash 30,100/$60; MiniMax M3.1 Flash 3,880/$20; Qwen3.8 Flash 5,400/$30; Kimi K2.7 Code 1,350/$60; GLM-5.3 220/$15; K3.1 Pro 147/$15; K3 110/$15) | https://opencode.ai/v2/docs/console/go/ | 2026-10-30 | Official | high | policies, docs |
| E3 | Go privacy: GLM/Kimi/MiMo/Qwen/MiniMax/DeepSeek/Step/Hy = "Not used" + 0-day; Muse Contributor = trains/Not ZDR; Iceman Contributor Free = trains/Not ZDR; Beam Free = no-train/30d; DeepSeek Global-region permission required; peak hours 01:00–04:00 & 06:00–10:00 UTC Mon–Fri | same | 2026-10-30 | Official | high | privacy gates |
| E4 | Console free set + terms: GLM-5.3-Flash Free & DeepSeek V4.1 Flash Free ZDR; MiMo/Nemotron/Flint free = feedback-collecting; Big Pickle stealth/train; Beam 30d/no-train; Jev 1.13 Free structured-classification only. Deprecation: DeepSeek V4 Flash 2026-10-26. OPENCODE_DISABLE_FREE_MODELS env supported | https://opencode.ai/v2/docs/console/models/ | 2026-10-30 | Official | high | free ordering |
| E5 | 74 live models incl. `opencode-go/glm-5.3-flash`, `opencode-go/kimi-k3.1-pro`, `opencode/glm-5.3-flash-free`, `opencode/deepseek-v4.1-flash-free`, `opencode/beam-free` (full list in global evidence.json) | `opencode models` on this machine | 2026-10-30 | Account verification | high | snapshot |
| E6 | Kimi K3.1 Pro released 2026-10-23: $2/$10, 1M ctx, thinking always-on; open weights promised by Nov 4 (not yet out) | https://www.kimi.ai/blog/kimi-k3-1-pro + https://www.yottalabs.ai/post/kimi-k3-1-pro-specs-price-open-weights-benchmarks | 2026-10-23/30 | Vendor + aggregator | medium | K3.1 Pro handling |
| E7 | Artificial Analysis: K3.1 Pro score 55 at $2.11/task | https://codersera.com/blog/kimi-k3-1-pro-complete-guide-2026/ | 2026-10 | Aggregator (unverified methodology) | low-medium | matrix only |
| E8 | DeepSeek V4.1 Flash wins 7 of 8 shared benchmarks vs GLM-5.3-Flash; composites close (49.4 vs 48.4); GLM ~1.4× cheaper blended | https://llm-stats.com/models/compare/deepseek-v4.1-flash-vs-glm-5.3-flash | 2026-10 | Independent aggregator | medium | decision §objections |
| E9 | MiMo 2.6 Flash loops tool calls (Glob/Find/Read), described as "unusable" | https://github.com/anomalyco/opencode/issues/50678 | 2026-10 | Single bug report | medium | demote MiMo to supervised-only |
| E10 | MiMo 2.6 Flash Free hit usage limits despite advertised free/unlimited | https://github.com/anomalyco/opencode/issues/51111 | 2026-10 | Single report | medium | "free ≠ unlimited" caveat |
| E11 | DeepSeek V4.1 Flash Terminal-Bench 2.1 90.6 / DeepSWE 74.2; GLM-5.3-Flash Terminal-Bench 84.3 / DeepSWE 63.4; Kimi K2.7 internal code bench 62.0 — different harnesses, NOT commensurable | prior repo memo's vendor survey: https://opencode.ai/v2/docs/console/go (retained) | 2026-10-30 | Vendor (non-commensurable) | medium | context only |
| E12 | Community reports contradictory on GLM vs DeepSeek preferences (r/opencode 2026-09/10) | docs/MODEL_RESEARCH.md sources 7–9 | 2026-10 | Anecdote | low | tie-break only |
| E13 | Built-in `websearch` tool returned no results during this pass; DuckDuckGo-backed search (MCP tools.web.search) used | This session | 2026-10-30 | Observed | high | research-method note |

Negative/conflicting evidence explicitly retained (not hidden): E8, E9, E10, E12. Vendor
benchmarks (E11) are deliberately NOT compared across vendors as if one experiment.

## Known gaps
- No live bakeoff was executed (quota preservation) → selection confidence capped; scheduled next session.
- Workspace Global-region permission state unknown → DeepSeek routes gated, not disabled silently.
- MiniMax M3.1 Flash / Qwen3.8 Flash operational reliability in OpenCode Desktop: no independent reports found in this pass.
