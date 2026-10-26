/** The home-screen / PWA icons from the Liquid Glass set, under public/app-icons/. */
export const APP_ICONS = ["default", "dark", "clear", "tinted", "dark-red", "tinted-red"] as const;

export type AppIconId = (typeof APP_ICONS)[number];

// index.html reads the same key before first paint, so keep the two in step.
const STORAGE_KEY = "wallet.appIcon";
// public/app-icon-sw.js reads the choice from here when serving the manifest.
const CACHE_NAME = "wallet-app-icon";
const CACHE_KEY = "/__app-icon";

export function appIconUrl(id: AppIconId, file = "icon-192.png"): string {
  return `/app-icons/${id}/${file}`;
}

export function readAppIcon(): AppIconId {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (APP_ICONS.includes(v as AppIconId)) return v as AppIconId;
  } catch {
    // Storage blocked — fall back to the default.
  }
  return "default";
}

/**
 * Points the tab icon and Apple touch icon at the chosen set right away, and
 * hands the choice to the service worker so the next manifest fetch — the one
 * the browser uses to refresh an installed app's icon — names it too.
 */
export async function setAppIcon(id: AppIconId): Promise<void> {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode — the choice just will not stick.
  }
  document.getElementById("app-favicon")?.setAttribute("href", appIconUrl(id, "favicon-32.png"));
  document.getElementById("app-touch-icon")?.setAttribute("href", appIconUrl(id, "apple-touch-icon.png"));
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(CACHE_KEY, new Response(id));
    } catch {
      // Cache Storage unavailable — the installed icon stays as it was.
    }
  }
}
