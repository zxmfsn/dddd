const CACHE_NAME = "cat-app-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./extra.js",
  "./cat.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((res) => res || fetch(event.request)));
});
