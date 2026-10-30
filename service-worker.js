/*
  Gourmet Meal Plan SPA - Service Worker
  ------------------------------------------------------------
  Objective:
  Cache the static app shell for repeat visits on supported origins. CDN-hosted
  Tailwind/Alpine are intentionally not pre-cached because this project preserves
  the zero-build/two-CDN requirement. Browsers and CDNs will handle their own
  caching for those resources.

  Notes:
  - Service workers work on HTTPS and localhost, not ordinary file:// usage.
  - Cache name changes on each material release so old shells are evicted.
*/
const CACHE_NAME = 'gourmet-meal-plan-spa-v3-nutrition-20261026';
const APP_SHELL = [
  './',
  './index.html',
  './README.md',
  './COMPLIANCE_REVIEW.md',
  './NUTRITION_RESEARCH.md',
  './AGENT.md',
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
  './assets/icons/calendar.svg',
  './assets/icons/chef-hat.svg',
  './assets/icons/knowledge.svg',
  './assets/icons/recipe.svg',
  './assets/icons/shopping.svg'
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        return response;
      });
    })
  );
});
