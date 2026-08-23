import { createRoot } from "react-dom/client";
import "./lib/safeStorage";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// iOS em modo PWA pode calcular 100vh maior que a área visível.
// Essa variável mantém o app dentro da altura real da tela.
const setAppHeight = () => {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
};

setAppHeight();
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () => window.setTimeout(setAppHeight, 250));

// Remove o fallback de boot do index.html antes de montar o React
const rootEl = document.getElementById("root")!;
const bootFallback = document.getElementById("boot-fallback");
if (bootFallback && bootFallback.parentNode === rootEl) {
  rootEl.removeChild(bootFallback);
}

createRoot(rootEl).render(<App />);

// ============= PWA Service Worker =============
// Só registra fora do preview/editor Lovable e fora de iframes,
// para evitar que cache atrapalhe o desenvolvimento.

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.includes("lovable.dev") ||
  host === "localhost";

const isOldIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /OS 12_|OS 11_|OS 10_/i.test(navigator.userAgent);

if (isPreviewHost || isInIframe || isOldIOS) {
  // Limpa qualquer SW antigo no contexto de preview/editor
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else {
  // Em produção (publicado), registra com auto-update
  registerSW({ immediate: true });
}
