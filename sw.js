// Service Worker — офлайн-режим конвертера.
// Стратегия "сеть в приоритете": при наличии интернета всегда берём свежую
// версию (и обновляем кэш), а кэш используем только когда сети нет.
const CACHE = "currency-converter-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./rates.js",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Запросы курсов к API — всегда из сети, кэш не трогаем.
  if (
    url.hostname.includes("frankfurter") ||
    url.hostname.includes("boi.org.il") ||
    url.hostname.includes("er-api.com") ||
    url.pathname.includes("/api/")
  ) {
    return;
  }

  // Оболочка приложения: сеть в приоритете, кэш — резерв для офлайна.
  e.respondWith(
    fetch(req)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
  );
});
