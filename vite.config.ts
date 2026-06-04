import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import {
  FIREBASE_STORAGE_IMAGE_CACHE_MAX_AGE_SECONDS,
  FIREBASE_STORAGE_IMAGE_CACHE_MAX_ENTRIES,
  FIREBASE_STORAGE_IMAGE_CACHE_NAME,
  FIREBASE_STORAGE_IMAGE_URL_PATTERN,
} from "./src/utils/imageCache";

export default defineConfig({
  base: "/kk-tripcat/",
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: FIREBASE_STORAGE_IMAGE_URL_PATTERN,
            handler: "CacheFirst",
            options: {
              cacheName: FIREBASE_STORAGE_IMAGE_CACHE_NAME,
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: FIREBASE_STORAGE_IMAGE_CACHE_MAX_ENTRIES,
                maxAgeSeconds: FIREBASE_STORAGE_IMAGE_CACHE_MAX_AGE_SECONDS,
              },
            },
          },
        ],
      },
      manifest: {
        name: "KK TripCat",
        short_name: "KK TripCat",
        description: "KK TripCat Travel Planner",
        theme_color: "#7EC8E3",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/kk-tripcat/",
        start_url: "/kk-tripcat/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
