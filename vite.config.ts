import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/muda/",
  define: {
    __AGENTATION_WORKSPACE_ROOT__: JSON.stringify(process.cwd()),
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      manifest: {
        name: "Muda APP",
        short_name: "muda",
        description: "Muda",
        start_url: "/muda/",
        theme_color: "#1a1d23",
        background_color: "#1a1d23",
        display: "fullscreen",
        icons: [
          {
            src: "logo.svg",
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
