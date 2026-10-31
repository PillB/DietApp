# Model selection decision — Gourmet Kitchen (DietApp)

Date: 2026-10-30. Evidence: see `MODEL_EVIDENCE_REGISTER.md`; scoring weights per global methodology
(30% correct completion, 20% tool reliability, 20% effective quota efficiency, 10% speed,
10% context, 10% maintainability; privacy/availability/no-paid-spend are hard gates).

## Decision
- Primary: **`opencode-go/glm-5.3-flash`** — implemented globally and in project `opencode.json`.
- Go fallback order: minimax-m3.1-flash → qwen3.8-flash → mimo-v2.6-flash (supervised) → kimi-k2.7-code → glm-5.3 → kimi-k3.1-pro (user-approved only).
- Free fallback order: glm-5.3-flash-free → deepseek-v4.1-flash-free → beam-free (general only).
- Deferred: deepseek-v4.1-flash (Go) — high potential (43,330 req/5h, $100 limit) but blocked until
  the user verifies/enables the workspace Global-region permission in Console. NOT enabled silently.
- Excluded: kimi-k3 (prior quota-exhaustion experience), all training/retention-restricted free variants
  for any use involving private project data (see global policy `excluded`).

## Why GLM-5.3-Flash as primary
1. Only candidate with account-verified live behavior in this exact environment (this session ran on it:
   tools, edits, tests all working).
2. Best balanced quota economics among verified-capable candidates: ~6,320 req/5h, $60/mo, $0.15/$0.50,
   0-day retention, no training (official).
3. DeepSeek V4.1 Flash scores marginally better on independent aggregates but carries three frictions:
   region-permission gate, peak-hours pricing, and mixed community reliability reports → not a default.
4. Prior repo memo independently recommended the same ordering; no contradicting fresh evidence found.

## Scoring (expected, not measured — bakeoff not run)
Rough normalized scores (no live bakeoff, so this is evidence-weighted expectation):
| Model | Correct | Tool-rel | Quota-eff | Total (weighted) |
|---|---:|---:|---:|---:|
| glm-5.3-flash | 8 | 8 | 7 | 7.7 |
| deepseek-v4.1-flash (blocked) | 8.5 | 6.5 | 9 | 7.9 (gate-blocked) |
| minimax-m3.1-flash | 7 | 7 | 6.5 | 6.9 |
| mimo-v2.6-flash | 6 | 4.5 (issue #50678) | 9 | 6.0 |
| kimi-k2.7-code | 8 | 7.5 | 5 | 6.9 |

## Expert-rejection review
Q: "What would an expert in reliable coding-agent systems reject about this recommendation?"

1. **Strongest objection:** "GLM-5.3-Flash's runner-up status against DeepSeek V4.1 Flash on independent
   benchmarks (llm-stats: 7 of 8 head-to-head wins for DeepSeek) suggests the default leaves quality on
   the table." → Mitigation recorded: DeepSeek remains one user action away (verify Global region). The
   bakeoff protocol exists to settle it empirically. Acceptable: quality delta is small, DeepSeek's
   quota-efficiency advantage doesn't matter at current usage levels.
2. **"You ranked MiMo above K2.7 Code despite a documented tool-loop bug."** → Accepted as valid: MiMo is
   listed AFTER qwen3.8-flash and marked supervised-only; issue #50678 makes it unacceptable as an
   unattended fallback. Documented.
3. **"No live bakeoff = selection rests on weights you invented."** → Accepted partially. Confidence is
   explicitly lowered (see below). The bakeoff remains scheduled for the next work session with the
   prior memo's protocol (3×5-minute tasks, identical starting commits).
4. **"Session-run-on-itself evidence is circular."** → Rejected partially: it is not benchmark-grade,
   but it is the only account-verified operational datapoint and it did verify tool integration in this
   Desktop install; clearly labeled as such in the evidence register.

## Confidence
- Selection of primary: **medium-high** (official terms + live behavior + consistent with fresh prior research).
- Fallback order beyond #2: **medium-low** (unverified-in-account ordering of minimax/qwen/mimo).
- Free fallback: **medium** (policy terms verified; coding ability of free endpoints untested in-session).

## Trade-offs stated (nothing silently absorbed)
- Quota efficiency was favored over peak intelligence for the default. Consequence: very hard tickets may
  need explicit escalation to kimi-k2.7-code/glm-5.3 — by design, with checkpoints.
- Kimi K3/K3.1 excluded from unattended use despite capability; this discloses prior negative experience
  rather than re-testing it this round.
- No model calls were spent on a bakeoff; the trade-off is preserved quota vs lower selection confidence.
