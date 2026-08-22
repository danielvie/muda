import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/muda/",

  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      manifest: {
        name: "Muda APP",
        short_name: "muda",
        description: "Muda",
        start_url: "/muda/",
        theme_color: "#147a8f",
        background_color: "#147a8f",
        display: "fullscreen",
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 3500,
    host: true,
  },
});
