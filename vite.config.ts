import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import legacy from "@vitejs/plugin-legacy";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    target: ["es2018", "safari12"],
    cssTarget: "safari12",
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && legacy({
      // Browsers ALVO do bundle legacy (com nomodule + polyfills System.js)
      targets: ["defaults", "safari >= 12", "ios_saf >= 12", "not IE 11"],
      // Polyfills modernos para o bundle "module" também (Safari 12 entende module mas precisa de polyfills)
      modernPolyfills: true,
      // CRÍTICO: precisa ser true para gerar <script nomodule> que o Safari 12 carrega como fallback
      renderLegacyChunks: true,
      // Polyfills extras necessários para iOS 12
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
    }),
    VitePWA({
      registerType: "autoUpdate",
      // Service worker NÃO ativa em dev/preview (evita cache no editor Lovable)
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "robots.txt",
      ],
      workbox: {
        // Carrega handler de Web Push (notificações com app fechado)
        importScripts: ["/push-handler.js"],
        // OAuth e rotas internas nunca devem ser cacheadas
        navigateFallbackDenylist: [/^\/~oauth/],
        // Não cachear chamadas à API/Supabase
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith("supabase.co") ||
              url.hostname.endsWith("supabase.in"),
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Miva — Finanças com carinho",
        short_name: "Miva",
        description:
          "Cuide do seu dinheiro com leveza, clareza e sem julgamento.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FFFFFF",
        theme_color: "#E91E63",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
