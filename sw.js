// Service Worker — офлайн-режим конвертера.
const CACHE = "currency-converter-v1";
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
  const url = new URL(e.request.url);

  // Запросы курсов к API — всегда из сети (свежие курсы), кэш не используем.
  if (url.hostname.includes("frankfurter.app") || url.hostname.includes("boi.org.il")) {
    return; // пусть идёт в сеть; при сбое приложение само включит резервную таблицу
  }

  // Остальное (оболочка приложения) — сначала кэш, затем сеть.
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
