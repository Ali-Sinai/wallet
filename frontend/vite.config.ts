import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/**/*.png"],
      manifest: {
        name: "کیف پول",
        short_name: "کیف پول",
        description: "ردیاب مالی شخصی",
        dir: "rtl",
        lang: "fa",
        display: "standalone",
        start_url: "/",
        scope: "/",
        background_color: "#08090a",
        theme_color: "#08090a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell + static assets only. API responses (/api/*) are never
        // cached here — stale financial numbers are worse than a spinner.
        // The dashboard's own "last fetched at" fallback (see useDashboard)
        // covers the offline case instead.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => !url.pathname.startsWith("/api/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "app-shell" },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  build: {
    // On Vercel the frontend is its own project with Root Directory =
    // frontend/, and Vercel can only publish output inside that root — so
    // build to the Vite default there. Everywhere else (local, Docker) keep
    // writing straight into backend/static, which FastAPI serves directly.
    outDir: process.env.VERCEL ? "dist" : "../backend/static",
    emptyOutDir: true,
  },
});
