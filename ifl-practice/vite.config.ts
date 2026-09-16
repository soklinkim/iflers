import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "IFL Practice",
        short_name: "IFL Practice",
        description: "Offline practice for past English exam papers.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#4f46e5",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // Papers are fetched on first open and then cached — no need to precache every JSON up front.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/src\/content\/papers\/.*\.json$/,
            handler: "CacheFirst",
            options: { cacheName: "paper-content" },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/assets/") && url.pathname.endsWith(".json"),
            handler: "CacheFirst",
            options: { cacheName: "paper-content" },
          },
        ],
      },
    }),
  ],
});
