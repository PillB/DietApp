# Model capability matrix — Gourmet Kitchen (DietApp)

Legend: ● strong evidence, ◐ partial/indirect, ○ weak/none. Evidence quality is reported
separately from expected performance (per methodology; see MODEL_EVIDENCE_REGISTER.md).

Live behavioral evidence: the active session on 2026-10-30 ran on `opencode-go/glm-5.3-flash`
executing real tools (reads, shell, edits, web) — the only account-verified behavioral datapoint.

| Candidate (exact ID) | Codebase nav & multi-file | Tool-call reliability | TS/JS/HTML/CSS | Test design & debugging | Numerical/aggregation | Long ctx | Quota efficiency (req/5h, $limit/mo) | Admission gates |
|---|---|---|---|---|---|---|---|---|
| opencode-go/glm-5.3-flash | ◐ vendor + ◐ community | ● LIVE verified this repo's session | ◐ vendor | ◐ prior memo | ○ untested | ◐ vendor | ● 6,320 / $60 | pass (0d, no train) |
| opencode-go/minimax-m3.1-flash | ◐ release notes | ◐ AG-closed model, always-reasons | ○ | ◐ llm-stats compare | ○ | ◐ | ◐ 3,880 / $20 | pass |
| opencode-go/qwen3.8-flash | ◐ | ◐ anthropic-style endpoint | ○ | ◐ llm-stats | ○ | ◐ | ◐ 5,400 / $30 | pass |
| opencode-go/mimo-v2.6-flash | ◐ | ✖ ISSUE #50678 tool-loop report | ○ | ◐ prior memo (QA role) | ◐ | ◐ | ● 30,100 / $60 | pass (supervised only) |
| opencode-go/kimi-k2.7-code | ◐ vendor code bench | ◐ | ◐ vendor | ● specialized code model | ◐ | ◐ | ◐ 1,350 / $60 | pass |
| opencode-go/glm-5.3 | ◐ vendor | ◐ | ◐ | ◐ | ◐ | ● larger | ✖ 220 / $15 | pass (escalation only) |
| opencode-go/kimi-k3.1-pro | ● vendor (1M ctx flagship) | ◐ | ● vendor | ● vendor | ◐ | ● 1M ctx | ✖ 147 / $15 | pass w/ user approval |
| opencode-go/deepseek-v4.1-flash | ◐ vendor (Terminal-Bench 90.6) | ◐ mixed community reports | ◐ | ◐ | ◐ | ◐ | ● 43,330 / $100 | ⚠ region permission unverified |
| opencode-go/kimi-k3 | ● vendor | ◐ | ● | ● | ◐ | ● | ✖ 110 / $15 | ⚠ prior exhaustion experience; excluded |
| opencode/go/glm-5.3-flash-free | = GLM-5.3-Flash (same family, served free) | ◐ | ◐ | ◐ | ○ | ◐ | ◐ free/throttled | pass (ZDR) |
| opencode/deepseek-v4.1-flash-free | = V4.1 Flash family | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | pass (ZDR) |
| opencode/beam-free | ○ unverified coding ability | ◐ | ○ | ○ | ○ | ◐ | ◐ "unlimited"≠throughput | pass (no train; 30d retention) |
| opencode/mimo-v2.6-flash-free | ◐ | ✖ #51111 limits + training | ○ | ◐ | ○ | ◐ | ✖ | ✖ private-data prohibition |
| opencode/nemotron-*:", opencode/big-pickle, opencode/flint-40b-free | ◐/○ | ◐ | ○ | ○ | ○ | ◐ | ◐ | ✖ private-data prohibition (trial/training terms) |
| opencode/jev-1.13-free / opencode-go longcat/hy/grok/gpt/claude/gemini | n/a for routing | — | — | — | — | — | mixed | specialized or paid-only; not ranked |

Scripts/HTML/CSS/UI/accessibility: no candidate has repo-specific evidence; all ◐/○ come
from general vendor/aggregator claims. The controlled bakeoff (prior memo) remains the only
repo-representative method; it was NOT run this round (quota preservation) — see
MODEL_SELECTION_DECISION.md for the confidence impact.
