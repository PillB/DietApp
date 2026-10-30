// ESLint flat config (P0 chore: cyclomatic complexity ceiling, AGENTS.md §Test requirements).
// Ceiling choice is evidence-based: SonarQube's CC refactor threshold is 15 for most
// languages (Campbell 2021), McCabe maps 11-20 as "moderate risk"; ESLint's raw default
// (20) is too lenient for a gate. Existing legacy violations must be ratcheted down
// over time (progress is tracked in docs/PROGRESS.md), not ignored with blanket per-file
// disables — use the explicit legacyCeiling override ONLY for measured hotspots.
const legacFiles = ["assets/js/data.js"]; // measured file-by-file; see PROGRESS.md ratchet table
export default [
  {
    files: ["scripts/**/*.cjs", "tests/**/*.cjs", "assets/js/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        console: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
      },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      complexity: ["error", 15], // gate: every new/edited function must satisfy
      "no-unused-vars": ["error", { caughtErrors: "none" }],
      "no-misleading-character-class": "error",
      "no-window": "off",
    },
  },
  {
    files: legacFiles,
    rules: {
      // legacy data/aggregation file measured ceiling — ratchet at each refactor pass
      complexity: ["error", 25],
    },
  },
];
