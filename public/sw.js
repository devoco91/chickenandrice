// public/sw.js
// v9 – robust offline fallback for navigations only.
// - Never touches /api, /_next/image, or /uploads
// - Uses navigation preload for speed when online
// - Falls back to cached /offline, then to inline HTML if needed

const CACHE = "crl-pwa-v9";
const OFFLINE_URL = "/offline";

// Best-effort precache of /offline
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
    } catch (err) {
      // If precache fails (first install or network issue), we’ll still render inline HTML later
      console.warn("[SW] Could not precache /offline:", err);
    }
  })());
});

// Clean old caches and enable navigation preload
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
    try { await self.registration.navigationPreload.enable(); } catch {}
    await self.clients.claim();
  })());
});

// Keep your notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/deliverydashboard";
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) {
      try { await c.focus(); if (c.navigate) c.navigate(url); return; } catch {}
    }
    if (self.clients.openWindow) self.clients.openWindow(url);
  })());
});

// Tiny inline fallback in case /offline wasn't cached yet
function inlineOfflineHTML() {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"/>
     <meta name="viewport" content="width=device-width,initial-scale=1"/>
     <title>You're offline</title>
     <style>
      :root{color-scheme:light dark}
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;
           display:grid;place-items:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;
            box-shadow:0 10px 30px rgba(2,6,23,.06);max-width:420px;text-align:center}
      button{border:0;border-radius:12px;padding:10px 16px;background:#111827;color:#fff;font-weight:600}
     </style></head><body>
     <main class="card">
       <h1>You’re offline</h1>
       <p>Open the app again when you have internet. Cached pages will still work.</p>
       <p><button onclick="location.reload()">Retry</button></p>
     </main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=UTF-8" } }
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept APIs, Next image optimizer, or uploads
  if (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/_next/image") ||
      url.pathname.startsWith("/uploads/")) {
    return;
  }

  // Intercept navigations only (full document requests)
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        // If nav preload is available, it's the fastest path
        const preload = await event.preloadResponse;
        if (preload) return preload;

        const res = await fetch(request);
        // If server returns 5xx or no response, use offline fallback
        if (!res || res.status >= 500) throw new Error("network/status fail");
        return res;
      } catch {
        // Try cached /offline, then inline fallback
        const cache = await caches.open(CACHE);
        const cached = await cache.match(OFFLINE_URL);
        return cached || inlineOfflineHTML();
      }
    })());
  }
});

// Optional: SW version ping
self.addEventListener("message", (event) => {
  if (event.data?.type === "PING") {
    event.ports?.[0]?.postMessage({ ok: true, version: CACHE });
  }
});
