# October 2026 evidence and portioning upgrade

**Start here:** Open `index.html`, then choose **Nutrition & Portions**. This adds seven structured, weighed, flavorful meal variants with indicative per-serving energy/protein/fiber estimates, an adult-only energy estimator, a flexible 4-week repetition scheduler, and correctly aggregated ingredient demand by date range and individual portions. Default schedule is the next Monday–Sunday with one example dinner per day; it is **not** a full daily nutrient plan.

**Important correction:** The original 29 recipes were reviewed editorially for ingredient choices, but they were **not** nutrient-verified. Previous `compliance` statuses should not be read as clinical or full macro verification. Refer to [`NUTRITION_RESEARCH.md`](NUTRITION_RESEARCH.md), [`AGENT.md`](AGENT.md), and `nutrition-reviewed.json`. Brand-label added sugar, sodium, saturated fat and finished yield remain unverified. The 7 weighed variants are *new*, not silent replacements of the original recipes. All macro estimates are approximate.

**Privacy:** `data/private/` stores the original uploaded PDF, order workbook and report for local provenance. `.gitignore` excludes this folder from Git commits; **do not force-add it** or host it on public GitHub Pages. Only publish non-sensitive nutrition-reviewed data. A static website's content is public to visitors.

**Run:** Double-click `index.html` (requires internet for Tailwind/Alpine CDNs), or run `python -m http.server 8000` from this folder and browse `http://localhost:8000`. For GitHub Pages, push the project files without `data/private/` and set Settings → Pages → Deploy from branch → main/(root). Deployment has not been performed automatically.

**Test:** `node --test tests/nutrition-core.test.cjs`. For browser tests, run `python tests/test_ui_playwright.py` in an environment with Playwright and Chromium; prints pass/fail results. `tests/QA_REPORT.md` reports execution results.

---

# Gourmet Meal Plan SPA

A dark-mode, GitHub Pages-ready Single Page Application for a personalized one-month gourmet meal plan. The app turns the validated meal-plan data into an interactive personal-chef dashboard with a calendar, weekly menus, full recipes, compliance notes, shopping lists, print views, and an exportable JSON data layer.

## Current status

**Version:** `2.0-dga-compliance-review`  
**Latest update:** Dietary Guidelines compliance pass + recipe and shopping-list corrections  
**Build tools:** none  
**Runtime dependencies:** Tailwind CSS CDN + Alpine.js CDN only  
**Local file support:** opens directly as `index.html` for core functionality  
**Best PWA behavior:** use `localhost` or GitHub Pages because service workers require an origin

## What changed in v2.0

The project was re-reviewed against the uploaded Dietary Guidelines PDF and official public guidance. The core rule set is now embedded in `assets/js/data.js` under `dietGuidelineRules` and surfaced in the new **DGA Review** page.

### Recipe and nutrition-compliance corrections

- Removed processed-meat traps from the pizza and croissant concepts.
  - Pizza now uses spicy roasted mushrooms and chile-roasted tomatoes instead of processed cured meat.
  - Croissant now uses home-roasted turkey breast or pork tenderloin instead of ham-style deli meat.
- Rebuilt dessert formulas so added sugar stays at or below **10 g per serving**.
  - Churro sundae, chicha mousse, lucuma tiramisu, and dark chocolate pecan tart were all revised.
- Made alcohol non-default.
  - Verjus, vinegar, stock, espresso, almond extract, and tea-style alternatives are now the default; alcohol remains optional for adult service.
- Replaced additive-prone condiments.
  - Bottled sweet-savory sauces/commercial mayonnaise/packaged crackers were replaced with homemade tomato-tamarind glaze, yoghurt-aioli, rolled oats, or cooked potato.
- Reduced sodium load where recipes use umami condiments.
  - Low-sodium soy/tamari, unsalted stock, acid, herbs, chiles, and fermented pastes are used as the default flavor strategy.
- Updated shopping lists to reflect the revised recipes.

## Features

- **Dashboard:** executive summary, four-week overview, and live content counts.
- **Interactive calendar:** 28-day grid with clickable meal cards.
- **Daily view:** breakfast, lunch, dinner, and optional snack/dessert cards linked to recipes.
- **Weekly menus:** tabbed week navigation with theme and prep highlights.
- **Recipe library:** searchable recipe cards and full recipe modals.
- **Recipe modal:** mise en place, ingredients, method, science notes, plating/pairing, and PDF-compliance notes.
- **DGA Review page:** embedded rule set, major corrections, recipe-by-recipe audit cards, and summary metrics.
- **Shopping lists:** week tabs, persistent checkboxes via `localStorage`, copy-all button, reset button, and print view.
- **Knowledge Map:** taste-DNA summary extracted from ordering behavior.
- **Export JSON:** one-click download of the full validated data object.
- **PWA-ready:** manifest and service worker included for static-shell caching on supported origins.

## Tech stack

- Static HTML
- Tailwind CSS via CDN
- Alpine.js via CDN
- Vanilla JavaScript
- No npm
- No Node.js
- No bundler
- No build step

## Folder structure

```text
gourmet-meal-plan-spa/
├── README.md
├── COMPLIANCE_REVIEW.md
├── .nojekyll
├── index.html
├── manifest.webmanifest
├── meal-plan-data.json
├── service-worker.js
└── assets/
    ├── css/
    │   └── tailwind.css
    ├── icons/
    │   ├── calendar.svg
    │   ├── chef-hat.svg
    │   ├── knowledge.svg
    │   ├── recipe.svg
    │   └── shopping.svg
    └── js/
        ├── app.js
        └── data.js
```

## Quick start: open locally

For the fastest test, open this file directly in your browser:

```text
index.html
```

Core calendar, recipe, shopping-list, and search functionality works without a server.

## Recommended local run

For the best experience, including service-worker registration and PWA behavior, run a tiny local server from the project folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example:

```text
gourmet-meal-plan-spa
```

2. Copy the contents of this folder into the repository.

3. Commit and push:

```bash
git init
git add .
git commit -m "Initial validated gourmet meal plan SPA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gourmet-meal-plan-spa.git
git push -u origin main
```

4. In GitHub, open:

```text
Settings → Pages
```

5. Choose:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

6. Your app will publish at:

```text
https://YOUR_USERNAME.github.io/gourmet-meal-plan-spa/
```

## Data editing guide

The canonical application data lives in:

```text
assets/js/data.js
```

The same data is also exported as plain JSON for reuse:

```text
meal-plan-data.json
```

### Important data objects

- `knowledgeMap`: the User Flavor Knowledge Map.
- `weeklyOverviews`: themes and prep highlights for each week.
- `dailyPlans`: the 28-day menu grid.
- `recipes`: full recipe records.
- `shoppingLists`: categorized weekly shopping lists.
- `dietGuidelineRules`: embedded PDF-derived compliance rule set.
- `complianceAudit`: top-level validation summary and correction log.

### Editing a recipe safely

When editing a recipe, update these fields together:

```js
{
  id,
  name,
  cuisine,
  servings,
  activeTime,
  totalTime,
  miseEnPlace,
  ingredients,
  method,
  whyThisWorks,
  plating,
  compliance,
  fullMarkdown
}
```

The app uses structured fields for the UI and `fullMarkdown` for an auditable source-text panel in the recipe modal.

## Dietary compliance rule set used in this project

The app applies a practical cooking translation of the PDF guidance:

1. Use whole/minimally processed ingredients.
2. Keep added sugar at or below 10 g per serving/meal.
3. Prefer fiber-rich whole grains over refined grains.
4. Include protein at each meal from varied sources.
5. Prioritize olive oil, nuts, seeds, avocados, seafood fats, and unsweetened full-fat dairy.
6. Avoid artificial flavors, artificial colors, artificial preservatives, nonnutritive sweeteners, and additive-heavy packaged products.
7. Use sodium-aware umami: low-sodium tamari/soy, unsalted stocks, acid, herbs, chiles, and fermented pastes.
8. Make alcohol optional and provide non-alcoholic defaults.

## Browser notes

- `index.html` works directly from a browser for normal app use.
- Clipboard copy may require HTTPS, localhost, or user permission depending on browser.
- Service worker caching works on `localhost` or HTTPS origins such as GitHub Pages.
- Tailwind is loaded via CDN to preserve the zero-build requirement. For a production environment with strict offline requirements, generate and vendor a static Tailwind build.

## Troubleshooting

### The app opens but styles are missing

Check that you are online. Tailwind is loaded from a CDN by design.

### Service worker does not register

Open the app via `localhost` or GitHub Pages. Browsers generally do not register service workers from `file://`.

### Shopping checkboxes disappeared

Checkboxes are saved in the browser's `localStorage`. Clearing site data or using private browsing can reset them.

### A calendar meal does not open a recipe

The app uses fuzzy matching from menu names to recipe names. If you rename a meal in `dailyPlans`, update the corresponding recipe `name` or `id` in `recipes`.

## Maintenance checklist

Before publishing a future edit:

- Open `index.html` locally.
- Click each main navigation route.
- Search for `pizza`, `aji`, `chocolate`, `salmon`, and `croissant` in the recipe library.
- Open at least one recipe from each week.
- Print one recipe and one shopping list.
- Use **Export JSON** and verify the downloaded JSON opens.
- Search `assets/js/data.js` for processed-meat or additive red flags before publishing.

## License / reuse

This project is a personal, static meal-plan application. You may adapt the code structure, but review the data and recipe text before sharing publicly.
