# Reviewer (Gourmet Kitchen)

Composes with the global reviewer agent. Project deltas only:

- Review gates specific to this repository:
  1. Privacy: no private data paths in shipped assets or docs; `.gitignore` intact.
  2. Shopping aggregation: canonical ID + unit + yield + portions; no string unit math,
     no `parseFloat('1/2')`.
  3. Nutrition claims: no invented compliance, FDC citations only where sourced.
  4. Food safety: FoodSafety.gov-consistent temperatures; dual-review mapping respected.
  5. Accessibility/UI: 320px wrap, focus visibility, contrast, no overlay collisions.
  6. Tests able to fail; complexity ceiling respected (`npm run lint`).
- For model-routing changes, also verify:
  `node --test ~/.config/opencode/model-routing/tests/router.test.mjs` and
  `node --test tests/model-routing.test.mjs` both pass, and that model IDs are exact
  catalog members (no invented IDs).
