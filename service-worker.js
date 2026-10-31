/*
  Gourmet Meal Plan SPA - Service Worker
  ------------------------------------------------------------
  Objective: cache the static app shell for repeat visits at the root OR at the
  /DietApp/ subpath URL that GitHub Pages serves. CDN Tailwind/Alpine are
  intentionally NOT pre-cached (zero-build/two-CDN requirement).

  Notes:
  - Service workers work only on HTTPS or localhost.
  - Cache name bumps on every material deploy so old shells evict.
  - Relative './' paths make the cache & fetch handlers valid regardless of
    whether the app sits at / or /DietApp/.
  - Composition + canonical recipe JSON files are fetched at runtime by the
    engine, so they must be stashed on first response to make offline mode work
    after a first visit.
*/
const CACHE_NAME = 'dietapp-v4-20261031';
const APP_SHELL = [
  './',
  './index.html',
  './README.md',
  './COMPLIANCE_REVIEW.md',
  './NUTRITION_RESEARCH.md',
  './nutrition-reviewed.json',
  './meal-plan-data.json',
  './manifest.webmanifest',
  './service-worker.js',
  './assets/css/tailwind.css',
  './assets/js/data.js',
  './assets/js/app.js',
  './assets/js/nutrition-data.js',
  './assets/js/nutrition-core.js',
  './assets/js/nutrition-ui.js',
  './assets/js/quantity.js',
  './assets/js/domain-schema.js',
  './assets/js/calendar-core.js',
  './assets/js/storage-core.js',
  './assets/js/import-weighed.js',
  './assets/js/food-names-es-pe.js',
  './assets/js/store-matches.js',
  './assets/js/shopping-core.js',
  './assets/js/shopping-ui.js',
  './assets/js/planner-core.js',
  './assets/js/planner-ui.js',
  './assets/js/diet-core.js',
  './assets/js/deficit-planner.js',
  './assets/js/i18n.js',
  './assets/js/cooking-core.js',
  './assets/js/cook-mode-ui.js',
  './assets/js/flavor-core.js',
  './assets/js/flavor-graph.js',
  './assets/js/flavor-ranking.js',
  './assets/js/flavor-ui.js',
  './assets/js/diet-nutrition-core.js',
  './assets/icons/calendar.svg',
  './assets/icons/chef-hat.svg',
  './assets/icons/knowledge.svg',
  './assets/icons/recipe.svg',
  './assets/icons/shopping.svg',
  './data/canonical/docx-diet-recipes-canon.v1.json',
  './data/reference/food-composition-tpca.v1.json',
  './data/fixtures/lima-stores-v1.json',
  './data/fixtures/flavor-lexicon-v1.json',
  './data/fixtures/ingredient-bridge-v1.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// On fetch: Cache First for the app shell, Network First for the dynamic
// composition JSON (so the owner's data updates without a stale SW shell).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  const isDynamic = /data\/(canonical|reference)\//.test(event.request.url);
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached && !isDynamic) return cached;
      return fetch(event.request).then((net) => {
        if (net && net.status === 200) {
          const copy = net.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return net;
      }).catch(() => cached || Response.error());
    })
  );
});
