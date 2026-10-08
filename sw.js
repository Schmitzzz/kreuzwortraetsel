// ===========================================================================
// sw.js – Service Worker: macht die App offline-fähig
//
// Ein Service Worker ist ein kleines Skript, das der Browser im Hintergrund
// laufen lässt. Er sitzt zwischen der App und dem Internet und kann jede
// Anfrage selbst beantworten – zum Beispiel aus einem Zwischenspeicher (Cache).
//
// Strategie hier: "stale-while-revalidate"
//   1. Ist die Datei im Cache? -> sofort von dort liefern (schnell, offline).
//   2. Gleichzeitig im Hintergrund die neueste Version holen und den Cache
//      aktualisieren. Beim nächsten Öffnen ist dann die neue Version da.
// ===========================================================================

// Bei größeren Änderungen hochzählen, dann wird der alte Cache weggeworfen.
const VERSION = "v1";
const CACHE_NAME = `schwedenraetsel-${VERSION}`;

// Alles, was die App zum Laufen braucht.
const DATEIEN = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/spiel.js",
  "js/speicher.js",
  "js/tastatur.js",
  "data/puzzles.json",
  "fonts/archivo-latin.woff2",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

// "install": passiert einmal, wenn eine neue Version des Service Workers kommt.
self.addEventListener("install", (ereignis) => {
  ereignis.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(DATEIEN))
      .then(() => self.skipWaiting()),          // sofort aktiv werden, nicht warten
  );
});

// "activate": alte Caches aufräumen.
self.addEventListener("activate", (ereignis) => {
  ereignis.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(
        namen.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),         // gleich alle offenen Seiten übernehmen
  );
});

// "fetch": jede Anfrage der App läuft hier durch.
self.addEventListener("fetch", (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== "GET") return;                       // nur Lesen cachen
  if (new URL(anfrage.url).origin !== self.location.origin) return;   // nur eigene Dateien

  ereignis.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const ausCache = await cache.match(anfrage, { ignoreSearch: true });

    const ausNetz = fetch(anfrage)
      .then((antwort) => {
        if (antwort.ok) cache.put(anfrage, antwort.clone());   // Kopie in den Cache
        return antwort;
      })
      .catch(() => ausCache);                                  // offline -> Cache

    if (ausCache) {
      ereignis.waitUntil(ausNetz);   // Hintergrund-Update zu Ende laufen lassen
      return ausCache;
    }
    return ausNetz;
  })());
});
