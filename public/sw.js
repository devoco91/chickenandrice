// public/sw.js
// v7: Safe navigation-only SW with explicit logging and error detection.
// Purpose: Prevents JSON/image corruption by strictly handling HTML navigations only.

const CACHE = "crl-pwa-v7"; // bump version to force SW upgrade
const OFFLINE_URL = "/offline"; // optional offline page

self.addEventListener("install", (event) => {
  console.log("[SW] Install event – caching offline page:", OFFLINE_URL);

  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.add(OFFLINE_URL).catch((err) => {
        console.error("[SW] Failed to cache offline page:", err);
      })
    )
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker v7...");
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== CACHE) {
            console.log("[SW] Deleting old cache:", k);
            return caches.delete(k);
          }
        })
      );
      await self.clients.claim();
      console.log("[SW] Activation complete.");
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only care about GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip API, Next.js image optimizer, and uploads
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/uploads/")
  ) {
    return; // do nothing
  }

  // Only intercept navigations that accept HTML
  if (request.mode === "navigate" && request.headers.get("accept")?.includes("text/html")) {
    console.log("[SW] Handling navigation request:", url.pathname);

    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (!response.ok) {
            console.warn("[SW] Network returned error status:", response.status, url.pathname);
            return response; // don’t fallback, just return real error
          }
          return response;
        } catch (err) {
          console.error("[SW] Network fetch failed, serving offline page:", url.pathname, err);
          const cached = await caches.match(OFFLINE_URL);
          return cached || Response.error();
        }
      })()
    );
  }
});

// Debugging hook: check SW version
self.addEventListener("message", (event) => {
  if (event.data?.type === "PING") {
    console.log("[SW] PING received, replying with version:", CACHE);
    event.ports?.[0]?.postMessage({ ok: true, version: CACHE });
  }
});
