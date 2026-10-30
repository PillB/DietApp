# Testing, regression and release gates

## Baseline truth
Existing `tests/QA_REPORT.md` reports 9/9 calculation tests and isolated nutrition-panel Playwright checks (via `set_content`), **not** full-site end-to-end CDN integration or GitHub Pages. This is not sufficient for public release.

## Test pyramid
**Unit:** rational fraction parsing 1/2, 1¾, unicode halves; weight and volume same-dimension conversions; negative, `NaN`, missing unit, recipe scale; derived macro calculations source evidence; pantry subtraction; store pack rounding; optional substitution; date inclusive filtering, week-year rollover and leap days; i18n fallback and privacy data serialization.

**Property/fuzz:** addition commutative/associative within dimension, scheduled recipe duplication doubles quantity, moving date outside range removes demand, increasing servings monotonically increases demand, no negative needed amounts, no merge of different variants, round-up never underbuys required packaged units.

**Integration:** real browser storage, reload, plan add/edit/delete/repeat, dinner twice on same day, no accidental duplication, dates correct Lima, repeat exceptions, shopping category grouping, SKU mapping, all languages, source evidence inspector.

**E2E Playwright:** served origin from local HTTP and deployed GitHub Pages HTTPS, real scripts, route refresh and CDN errors, keyboard-only and screen reader/accessibility scan. Mobile 320/375/390, tablet 768/1024 and desktop 1366/1440. Test real cooking steps with pause/resume, modal focus trapping and `Escape`, shopping copy/CSV/print, offline state and service worker updates. No simulation of success via data stubs unless specifically labeled fixture test.

**Visual:** two independent review passes for all main pages and states at all viewports/languages. Use `page.screenshot` and `expect(...).toHaveScreenshot` with known tolerances. DOM geometry audit x,y,w,h,centerX/Y, overlap exceptions for decorations, icon padding, sticky footer, target size. Compare first-pass defects and second-pass resolutions, then third pre-release smoke.

**Security/privacy:** ensure raw `data/private/`, `context/private/`, personal email excerpts, PDF and XLSX never appear in public build; `.gitignore` alone insufficient if previously committed. Validate assets and API keys. No unsafe HTML insertion from order strings. XSS escaping via textContent by default. CSP and dependency pinning. User-side offline data privacy visible.

**Food scientist release gate:** independently audited ingredient quantities, yields, cooking and pressure safety, storage and allergens, verified nutrient source links, labels distinct from inferred estimates. Reject any `nutrientVerified=true` without source IDs.

## Actual test reporting standard
Log exact command, commit, platform, environment, input fixtures, date, count PASS/FAIL/SKIP, screenshot paths, error/trace, root cause, correction and retest. **Never say tested unless executed.** Block deployment on P0 privacy leak, P1 math error, P4 safety issue, P6 translation of safety warning, P7 keyboard blocker.

## Suggested commands (once project adds dev harness)
```
node --test tests/nutrition-core.test.cjs
# Later, after configuring Playwright in package.json:
npx playwright test
npx playwright test --update-snapshots  # only after authorized design changes
python scripts/check_handover.py
```

## CI / GitHub Pages
PR: run unit, lint, schema validation, translation completeness, privacy scan and Playwright smoke; upload screenshot diffs. Main: gated deploy only after approval. Pages uses relative paths to support `/<repo>/`. Avoid requiring secrets in frontend; verify service-worker scope, no broken links, cache policy. No `git push` without target and explicit consent.
