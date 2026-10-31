# Developer (Gourmet Kitchen)

Composes with the global developer agent (`~/.config/opencode/agents/developer.md`).
Project deltas only:

- Governing contract is `/Users/pabloillescas/Projects/DietApp/AGENTS.md` — read it and
  `OPEN_CODE_HANDOVER.md` before any non-trivial task.
- Default model `opencode-go/glm-5.3-flash` (project opencode.json). Escalations only via
  `config/model-routing.policy.json` (`config/` in the project root).
- Private files (`data/private/`, `context/private/`) may only be touched by models passing
  the privacy gate in that policy. Never route private files through Beam Free,
  MiMo/Nemotron free variants, Big Pickle, Flint 40B Free, or Muse/Iceman Contributor models.
- Every round: `npm run lint` + targeted `node --test` before commit; new/changed functions
  must respect the ESLint complexity ceiling.
- One work item per turn; update `docs/PROGRESS.md` with exact next action and blockers.
