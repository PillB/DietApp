---
description: Run the 2-minute starting ritual, then implement exactly ONE P0-Px ticket with tests and a commit.
---
Follow the handover strictly. Read `AGENTS.md`, `OPEN_CODE_HANDOVER.md`,
`docs/IMPLEMENTATION_ROADMAP.md`, and `docs/PROGRESS.md` (last checkpoint).

Steps:
1. Run `python scripts/check_handover.py` and `node --test tests/` — record real output.
2. Pick the single next atomic ticket from `docs/IMPLEMENTATION_ROADMAP.md`
   (the one marked as next in `docs/PROGRESS.md`, e.g. P0.2).
3. Write/adjust a failing test first, implement the smallest vertical slice.
4. Re-run the targeted test, fix until green. No recipe or design changes
   beyond the ticket scope.
5. Update `docs/PROGRESS.md` (time in Lima, command outputs, blockers,
   exactly one next ticket + next command).
6. `git add` only intended files, `git status --short` check for private data,
   then `git commit`.

Stop after the commit. Do not start the next ticket autonomously.
