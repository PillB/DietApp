# OpenCode Go model selection and benchmark memo — verified 2026-10-30

## Recommendation
**Primary:** GLM-5.3-Flash for architecture-guided code changes and design-oriented full-stack implementation; **high-volume alternative:** DeepSeek V4.1 Flash (subject to workspace privacy region eligibility); **complex repair:** Kimi K2.7 Code; **independent low-cost critique:** MiMo-V2.6-Flash; **rare escalation:** GLM-5.3. Alternative primary choice: switch to DeepSeek if in-your-project bakeoff is faster/more reliable. No paid premium model should work without checkpoints.

## Why not Kimi K3 full-time?
OpenCode's official Go request model estimates ~110 requests/5h for Kimi K3 vs ~6,320 GLM-5.3-Flash and ~34,670 DeepSeek V4.1 Flash (at observed docs snapshot), while its token output price is $15/1M vs Flash $0.50/$0.60 off-peak, respectively. These are **not per-session time limits**, and a single five-minute stalled task may be due to tool/permissions/latency/context exhaustion—not solely quota. Diagnose with session logs, tools, and provider response. Reserve K3 for a short, sharply specified review only after free/Flash solutions fail.

## Official model economics (Go, observed October 30; verify again before using)
| Model | Input/1M | Output/1M | Cached read/1M | Reported Go model cap/month | Estimated Go requests/5h | Use |
|---|---:|---:|---:|---:|---:|---|
| GLM-5.3-Flash | $0.15 | $0.50 | $0.03 | $60 | 6,320 | balanced implementation and UX |
| DeepSeek V4.1 Flash (off-peak) | $0.15 | $0.60 | $0.003 | $100 (peak separate rate) | ~34,670 | context-heavy high-volume; privacy eligible |
| DeepSeek V4.1 Flash (peak) | $0.30 | $1.20 | $0.006 | same cap | varies | avoid needlessly expensive peak runs |
| Kimi K2.7 Code | $0.95 | $4.00 | $0.19 | $60 | 1,350 | tough repo fixes |
| Kimi K3 | $3.00 | $15.00 | $0.30 | $15 | 110 | high-cost escalation only |
| MiMo-V2.6-Flash | $0.14 | $0.28 | $0.0028 | $60 | ~30,100 | cheap independent QA |
| GLM-5.3 | $1.40 | $4.40 | $0.26 | $15 | 220 | critical architecture escalation |
| Beam Free / Iceman Contributor Free | Free | Free | Free | temporary | described unlimited | noncritical isolated trials only |

Go has model-specific rolling 5-hour 20% of monthly allowance, weekly 50%, monthly 100%. **Docs and promotions change.** Do not conflate requests with elapsed minutes. `Go` is $10/month, `Go Plus` $40/month. OpenCode requires some models to be enabled by workspace privacy settings: DeepSeek V4.1 Flash requires `Global` region permission; do not enable that unreflectively when processing private purchase data.

## Benchmarks and correct interpretation
- Z.ai GLM-5.3-Flash official blog: Terminal-Bench 2.1 **84.3**, DeepSWE v1.1 **63.4**, NL2Repo **56.3**, Toolathlon **78.4**. Vendor runs often use 6h timeouts, large contexts, and specific harnesses.
- DeepSeek official 2026-09-10 change log: Terminal-Bench 2.1 **90.6**, DeepSWE v1.1 **74.2**, ProgramBench **20.3**, NL2Repo-Bench **65.4**. NOT a controlled comparison against Z.ai due to harness/bench setup differences.
- Moonshot's Kimi K2.7 Code report: internal Kimi Code Bench v2 **62.0**, Program Bench **53.6**, MLS Bench Lite **35.1**; improvement over K2.6 but benchmark conditions differ.
- Community: September/October 2026 r/opencode reports are contradictory. Some prefer GLM for code/design or review, others DeepSeek for speed, lower cached-token costs or agentic fixes; another user reports DeepSeek ignoring tool-specific instructions. These are anecdotal, not a statistically controlled sample.
- The right benchmark is your actual repo: measure completion per unit cost and successful tested edits, not raw leaderboard alone.

## One-hour (3 x 5-minute) local bakeoff, reused prompt, isolated branches
Run `opencode models` and copy the exact `provider/model` IDs; *never guess the provider ID*. Start each model from same git commit and fresh OpenCode session on local, sanitized code. Three tasks:

A. **5m** fix one fractional ingredient test: `1/2 onion + 2 onions = 2.5; unit conversion 500g + 0.75kg = 1250g; produce tests first`.
B. **5m** implement scoped meal duplication by date without timezone shift and with persistence tests.
C. **5m** fix one Playwright mobile overflow from a screenshot audit with no other changes.

Record `model, exact ID, version, start/end, peak/offpeak, cost/dollars, provider errors, tokens, cached tokens, #tool calls, first meaningful write seconds, verified tests passed, regressions, failed runs, edited files, user intervention`. Score: 45% pass tests, 20% first meaningful write <90s, 15% cost per passed task, 10% no regressions, 10% instruction adherence. Repeat at least 3 seeds/attempts before calling a winner. Discontinue runaway work at 5m with checkpoint and direct diagnostic.

## Operational anti-stall policy
- Prompts: maximum one deliverable, clear exact file targets and acceptance tests; 1–3 files. Provide limited relevant source excerpts instead of entire report.
- First output must add either test fixture or source code; do not let agent narrate planning repeatedly.
- Stop conditions: no file edit/test command by ~90 sec; no measurable progress by 3m; 5m per unit hard review (human-driven, not a model-specific server timeout).
- If stalled: capture `git diff`, `git status`, OpenCode terminal logs, rate-limit error (429), missing permissions, blocked read, model privacy eligibility and network failure; retry once only when cause is known; otherwise switch to distinct model or split scope.
- Commits after green focused tests, each ticket; checkpoint to `docs/PROGRESS.md` for next session. Do not assume sleep/background execution resumes safely or automatically.

## Free models
Current official page advertised **Beam Free** and **Iceman Contributor Free** with time/region limitations; prior crawls list free preview models that may disappear. Useful for code search, formatting, snapshot summaries, isolated tests only. Test reliability and privacy policy first. 'Free' does not guarantee no training/retention. Use `/models` in actual account to confirm availability.

## Official sources, accessed 2026-10-30
1. https://opencode.ai/v2/docs/console/go — exact availability and limits, most current official page.
2. https://opencode.ai/docs/models — model ID notation and default config.
3. https://docs.opencode.ai/docs/cli/ — opencode run -m, models and diagnostics commands.
4. https://z.ai/blog/glm-5.3-flash — vendor benchmarks and methodology.
5. https://api-docs.deepseek.com/updates/ — DeepSeek V4.1 release and benchmarks.
6. https://www.kimi.ai/resources/kimi-k2-7-code — code model release and benchmarks.
7. https://www.reddit.com/r/opencode/comments/1wfqol6/glm_53_flash_vs_deepseek_v41_flash_which_one_do/ — user reports, anecdotal.
8. https://www.reddit.com/r/opencode/comments/1x36k86/costs_analysis_deepseek_v41_flash_vs_glm_53_flash/ — cached token anecdotal cost analysis.
9. https://www.reddit.com/r/opencode/comments/1x705kc/i_got_this_hold_my_beer_deepseekv41flash/ — counterexample to using a single model as reviewer.
