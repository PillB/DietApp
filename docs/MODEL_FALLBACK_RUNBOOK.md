# Model fallback runbook — Gourmet Kitchen (DietApp)

Policy source of truth: `~/.config/opencode/model-routing/policy.json` (global) +
`config/model-routing.policy.json` (project deltas). Selection logic: `router.mjs`.

## Pre-flight (always)
1. `opencode models` — confirm exact ID of the intended model exists TODAY.
2. Snapshot freshness: >24h → run `/revalidate-models` before new model decisions.

## Scenario playbook

### A. Go allowance exhausted (5h/weekly/monthly)
1. Save checkpoint (`~/.config/opencode/model-routing/checkpoints/` or `docs/PROGRESS.md`):
   steps done/undone + verification commands.
2. `/resume-after-quota` → target `opencode/glm-5.3-flash-free`.
3. MANUAL STEP: select it in the Desktop model picker (or new conversation). OpenCode does not
   switch a running conversation automatically.
4. Skip steps already verified; continue only unfinished work.
5. If private data involved: confirm privacy gate (GLM Free = ZDR ✓).

### B. Free pool exhausted
- STOP. Do not open other free models (shared pool). Record error text + any reset timing from
  the provider message. Report to user; document in `docs/PROGRESS.md`. Recovery = documented
  reset (typically rolling 5h window) or renewed Go allowance.

### C. Model missing / renamed / deprecated (404 / not in catalog)
1. `opencode models` → exact current ID.
2. One alternative at the same tier only; update both policy files; log in revalidation logs.

### D. Auth (401/403) / billing / region errors
- Stop the route. No credential edits, no privacy-region changes, no Extra Usage activation.
- Region-restricted DeepSeek: user opens Console → Settings › Privacy → decides. Never automated.

### E. Account-wide rate limit (429)
- Stop all attempts; record; do not blast equivalent models at the same account-wide limit.

### F. Coding failure (NOT provider failure)
- Per AGENTS.md discipline: reproduce → hypothesis → failing test → minimal fix → test;
  after 1 failed fix research the exact error; after 2 distinct failed fixes write escalation
  report and stop (escalation model permitted only if user approves the spend).

### G. Guided model switch (mid-session)
- `/diagnose-model-error` → classification → if policy prescribes fallback:
  checkpoint → tell user the exact `provider/model` ID to pick → resume via `/resume-after-quota`.

## Model bakeoff (when fresh selection is needed)
Follow `docs/MODEL_RESEARCH.md` §bakeoff: isolated branch, identical prompts and starting
commit, 3×5-minute tasks, score per its rubric. Skip if quota low; downgrade confidence instead.
