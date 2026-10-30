# Validation Report — October 26, 2026

## Release scope

This is a **nutrition research and portioning upgrade** to the pre-existing `gourmet-meal-plan-spa-v2-dga-reviewed` package. It corrects an important overclaim in v2: editorial “compliant” does not equal verified energy, sugar or micronutrient analyses. The v2 content is retained and clearly labeled as unverified. The new module introduces seven entirely new weighed gourmet variants and an independent, deterministic shopping calculator.

## Test rounds

| Round | Surface | Outcome | Defect or action |
|---|---|---|---|
| 1 | Node 9 calculation/regression cases | 8 passed, 1 failed initially | Mifflin expected test value incorrectly rounded from 1717.5 to 1718. Corrected test to the mathematically correct 1717.5. |
| 2 | Node 9 calculation/regression cases | **9 passed** | Verified energy formulas, input limits, 29/7 records, recipe calculations, ISO month changes, weekly recurrence and numeric ingredient sums. |
| 1 | Chromium Playwright, stand-alone nutrition panel | Failed to initialize | Inactive modal close event handler pointed to an absent `n-recipe-close` element; removed unused listener. |
| 2 | Chromium Playwright stand-alone nutrition panel | **Desktop and phone passed** | Added meal, removed schedule, translated EN↔ES, calculated tentative energy, shopping date ranges and verified `0.5 + 2 = 2.5 onions`. No browser page errors and no page-level horizontal overflow at 1360 and 390 CSS px. |

### Known test limitations

The sandbox administrator blocks direct Playwright navigation to `file://` **and** `127.0.0.1`. We therefore executed UI interaction and layout tests with **Playwright `page.set_content()`**, using the actual isolated nutrition panel HTML, injected local production nutrition CSS and JS, without remote Alpine/Tailwind loading. These results demonstrate the independent nutrition panel logic and styles, **not** complete end-to-end CDN integration, legacy recipe navigation, service worker, or GitHub Pages deployment. Perform a final manual browser pass on HTTPS with both CDNs available.

### Measurements / checks

- Dates stored as local YYYY-MM-DD, no `Date.toISOString()` timezone shift.
- Calendar defaults to **next Monday–Sunday**, not an arbitrary past month.
- Four-serving recipe purchased for one scheduled portion contributes one quarter of raw ingredient quantities.
- Two recipes requiring 0.5 and 2 onions combine to 2.5 whole onions when scheduled for four servings each.
- Raw and dry ingredient distinctions remain visible in recipe data; no mixing g and ml.
- No user body data prepopulated or saved by the nutrition estimator. Schedule storage only is localStorage.
- All seven curated variants have 7+ quantified ingredients and rough energy/protein/fiber values; none is labeled clinical/verified.
- All 29 original recipes present in their unmodified full recipe texts and flagged `nutrientVerified:false` in the original data; no fake label values.
- The old `COMPLIANCE_REVIEW.md` remains as historical editorial provenance with an explicit correction notice.
- Privacy: original workbook, PDF and report are stored in `data/private/` and ignored from Git commits, not in PWA cache.

## Remaining work / release caveats

1. Integrate authoritative FDC IDs and local brand nutrition labels for all recipe ingredients, calculate sodium, saturated fat and added sugar precisely.
2. Cook, weigh and validate actual plated yields and hidden oil usage; macro estimates cannot yet be certified.
3. Review diet-specific targets with current user information / medical guidance; nonadult/pregnancy/clinical use not supported.
4. Complete full-browser HTTPS deployment smoke tests and verify full legacy SPA visuals, screen-reader usability and CDNs.
5. Translate **all** original app and nutrition panel text across requested six languages with professional review. Nutrition controls EN/ES are partially translated; clinical source discussion intentionally in English pending full localization.
6. Ask for Github repository before deployment; nothing has been pushed.
