// Imported by the generated service worker (vite.config.ts → workbox.importScripts).
// The installed PWA's icon comes from the web manifest, so the manifest has to
// name the icon chosen in Settings. The page keeps that choice in Cache
// Storage (src/lib/appIcon.ts) — the one store both sides can read — and this
// rewrites the manifest's icon paths from app-icons/default/ to the choice.
const APP_ICON_CACHE = "wallet-app-icon";
const APP_ICON_KEY = "/__app-icon";
const APP_ICONS = ["default", "dark", "clear", "tinted", "dark-red", "tinted-red"];

async function chosenAppIcon() {
  const cache = await caches.open(APP_ICON_CACHE);
  const hit = await cache.match(APP_ICON_KEY);
  const id = hit ? (await hit.text()).trim() : "default";
  return APP_ICONS.includes(id) ? id : "default";
}

async function manifestResponse(request) {
  let base;
  try {
    base = await fetch(request);
  } catch {
    base = await caches.match(request, { ignoreSearch: true });
  }
  if (!base || !base.ok) return base || Response.error();
  const icon = await chosenAppIcon();
  if (icon === "default") return base;
  const manifest = await base.json();
  for (const entry of manifest.icons || []) {
    entry.src = entry.src.replace("app-icons/default/", `app-icons/${icon}/`);
  }
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname !== "/manifest.webmanifest") return;
  // Registered before Workbox's own fetch listener, which would otherwise serve the precached copy.
  event.stopImmediatePropagation();
  event.respondWith(manifestResponse(event.request));
});
