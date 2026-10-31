# Model market research — Gourmet Kitchen (DietApp)

Research date: **2026-10-30** (snapshot `evidence-2026-10-30T2352Z`). Supersedes the
observational portions of `docs/MODEL_RESEARCH.md` only where noted; that memo remains the
record of the earlier benchmark survey and bakeoff methodology.

## Method
1. Live account catalog: `opencode models` (74 models, 2026-10-30) — actual, not aspirational.
2. Official terms: https://opencode.ai/v2/docs/console/go/ and
   https://opencode.ai/v2/docs/console/models/ (fetched 2026-10-30).
3. Targeted independent checks on models NEW since the previous memo (Kimi K3.1 Pro,
   MiniMax M3.1 Flash, Qwen3.8 Flash, MiMo 2.6 reliability).
4. Prior memo's benchmark survey retained (Terminal-Bench/DeepSWE/vendor reports, r/opencode anecdotes).

## Inventory deltas vs previous snapshot (same day, earlier)
| Change | Detail | Source |
|---|---|---|
| NEW Go model | Kimi K3.1 Pro — released 2026-10-23, $2/$10 per 1M, 1M ctx, thinking always-on. Go: $15/mo limit ⇒ ~147 req/5h | kimi.ai blog; opencode.ai/v2/docs/console/go |
| DEPRECATED | DeepSeek V4 Flash deprecated 2026-10-26 (V4.1 succeeds) | opencode.ai/v2/docs/console/models |
| NEW high-volume Go candidates | MiniMax M3.1 Flash ($20 limit, ~3,880 req/5h), Qwen3.8 Flash ($30, ~5,400), LongCat-2.0 ($60, ~11,400) | Go docs |
| Privacy classified | Per-model training/retention rows published: GLM/Kimi/MiMo/Qwen/MiniMax/DeepSeek/Step/Hy = not-used + 0-day. Muse Contributor & Iceman Contributor Free = train (Not ZDR). Beam Free = no training, 30-day retention | Go docs §Privacy |
| Reliability report | anomalyco/opencode#50678: MiMo 2.6 Flash loops Glob/Find/Read, "unusable". anomalyco/opencode#51111: MiMo 2.6 Flash Free hit limits despite "free" | GitHub issues 2026-10 |
| Free pool confirmed | Console free set: GLM-5.3-Flash Free, DeepSeek V4.1 Flash Free, MiMo-V2.6-Flash Free, Nemotron frees, Big Pickle, Flint 40B Free, Jev 1.13 Free (structured-classification only, not a coding agent) | Console models docs |

## Free models: real terms (do not assume "free = safe = unlimited")
- ZDR, no training: **GLM-5.3-Flash Free**, **DeepSeek V4.1 Flash Free** ✓ usable for private project data.
- 30-day retention, no training: **Beam Free** (also offered in Go; not "unlimited" throughput; region-block list does not include Peru) — fine for general work, not private files.
- Collect data to improve the model during free period: **MiMo-V2.6-Flash Free, Nemotron 3/3.5 (NVIDIA trial terms: no personal or confidential data), Flint 40B Free, Big Pickle** — prohibited for `data/private/`, `context/private/`, purchase history.
- **Jev 1.13 Free**: structured classification micro-task model (noul/choice/score), not a general coding agent. Out of scope for routing.
- Free endpoints share throttled capacity; "Unlimited" ≠ guaranteed throughput (#51111).

## Benchmark interpretation caution
Vendor-reported scores come from different harnesses (see prior memo). Independent
aggregators (llm-stats) put DeepSeek V4.1 Flash narrowly ahead of GLM-5.3-Flash overall,
but with methodology variance; and DeepSeek on Go carries region-permission friction and
peak pricing windows. The decisive benchmark for this repo remains measured task completion
per quota unit (prior memo's bakeoff protocol in `docs/MODEL_RESEARCH.md` §bakeoff).

## Limitations of this snapshot
- Built-in websearch tool failed ("no results") during research; DuckDuckGo-backed MCP/search used instead. Note for future runs.
- No live model bakeoff was run (quota preservation); confidence adjusted accordingly.
- Workspace region-permission settings (affects DeepSeek) not readable from this session.
