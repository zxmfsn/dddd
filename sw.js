const CACHE_NAME = "cat-app-v1";
const ASSETS = ["./", "./index.html", "./style.css", "./script.js", "./extra.js", "./cat.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
