---
name: Solarize Fallback
description: Interim, NON-authentic stand-in for the user's "PILLB Solarize" skill. Art Nouveau + solarized-paper direction only; not the original and not a licensed style. Use until the real skill is supplied in context/, then re-evaluate and replace aesthetic tokens per AGENTS.md §Solarize handling.
---

# Solarize Fallback (interim adapter — explicitly NOT the original PILLB skill)

The named original was never supplied in any session. This file keeps the
project consistent with `AGENTS.md` and `docs/UX_DESIGN_SYSTEM.md` until the
user provides the real skill file under `context/`. Do not describe it to the
user as the genuine PILLB implementation.

## Direction only (loose, non-normative)
- Organic Art Nouveau flourishes (vine/whiplash curves), solarized warm paper
  base, restrained teal/amber accents. Never at the cost of contrast or focus
  visibility.
- Hard rules that dominate over aesthetics: WCAG AA contrast on all text,
  visible focus outlines, no text below 14px, no 320px horizontal overflow,
  full keyboard reachability (`docs/UX_DESIGN_SYSTEM.md` tokens are canonical).

## When the real skill arrives
1. Read the supplied definition fully; verify license terms for derivative CSS.
2. Compare against interim tokens for accessibility regressions.
3. Replace aesthetic choices only; keep safety/accessibility rules intact.
4. Record the comparison in `docs/DECISIONS_AND_UNKNOWNS.md`.
