import { useEffect, useState } from "react";

export type DeviceKind = "ios" | "android" | "other-mobile" | "tablet" | "desktop";

function isTabletViewport(): boolean {
  if (typeof window === "undefined") return false;
  const w = (window.screen && window.screen.width) || window.innerWidth || 0;
  const h = (window.screen && window.screen.height) || window.innerHeight || 0;
  const shortestSide = Math.min(w, h);
  // iPad Mini 2 = 768x1024 (shortestSide 768). Threshold reduzido para 700.
  return shortestSide >= 700 || (typeof window.matchMedia === "function" && window.matchMedia("(min-width: 700px)").matches);
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) return true;
  return ((navigator as any).maxTouchPoints || 0) > 0;
}

function detectDevice(): DeviceKind {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent || "";

  // iPad: detecção robusta — qualquer iPad é sempre tratado como tablet
  const isIPad =
    /iPad/i.test(ua) ||
    // iPadOS 13+ se identifica como Mac com touch
    ((navigator.platform === "MacIntel" || /Macintosh|Mac OS X/i.test(ua)) &&
      ((navigator as any).maxTouchPoints || 0) > 1);

  const isIPhone = /iPhone|iPod/i.test(ua);

  // iPad sempre é tablet (independente de viewport — iPad Mini 2 tem 768x1024)
  if (isIPad && !isIPhone) return "tablet";
  if (isIPhone) return "ios";

  if (/Android/i.test(ua)) {
    // Android tablet (sem "Mobile" no UA) também é tablet
    if (!/Mobile/i.test(ua) && isTabletViewport()) return "tablet";
    return "android";
  }

  const isMobileUA = /Mobi|Opera Mini|IEMobile|BlackBerry/i.test(ua);
  if (isMobileUA) return "other-mobile";
  if (/Tablet/i.test(ua)) return "tablet";

  // Touch device com viewport de tablet => tablet
  if (isCoarsePointer() && isTabletViewport()) return "tablet";

  const smallTouch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 699px)").matches &&
    ((navigator as any).maxTouchPoints || 0) > 0;
  if (smallTouch) return "other-mobile";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  // iOS
  if ((navigator as any).standalone === true) return true;
  // Android / desktop PWA
  if (typeof window.matchMedia !== "function") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  return false;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.includes("lovableproject.com") ||
    h.includes("lovable.app") && h.includes("id-preview--") ||
    h === "localhost"
  );
}

export interface InstallGateState {
  device: DeviceKind;
  installed: boolean;
  /** true = bloquear app e exigir instalação */
  mustInstall: boolean;
  /** evento beforeinstallprompt capturado (Android/Chrome) */
  installPromptEvent: any | null;
  triggerInstall: () => Promise<void>;
}

export function useInstallGate(): InstallGateState {
  const [device, setDevice] = useState<DeviceKind>("desktop");
  const [installed, setInstalled] = useState(true);
  const [installPromptEvent, setInstallPromptEvent] = useState<any | null>(null);

  useEffect(() => {
    setDevice(detectDevice());
    setInstalled(isStandalone());

    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(display-mode: standalone)") : null;
    const onMq = () => setInstalled(isStandalone());
    if (mq && typeof mq.addEventListener === "function") mq.addEventListener("change", onMq);
    else if (mq && typeof (mq as any).addListener === "function") (mq as any).addListener(onMq);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      if (mq && typeof mq.removeEventListener === "function") mq.removeEventListener("change", onMq);
      else if (mq && typeof (mq as any).removeListener === "function") (mq as any).removeListener(onMq);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installPromptEvent) return;
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        setInstalled(true);
      }
      setInstallPromptEvent(null);
    } catch {
      // ignore
    }
  };

  // Mobile = só celular (iPhone, Android phone, outros mobiles). Tablets/iPad e desktop NÃO precisam instalar.
  const isMobile = device === "ios" || device === "android" || device === "other-mobile";
  // Não bloquear no preview do Lovable nem dentro de iframes (impossível instalar)
  const blockedByEnv = isInIframe() || isPreviewHost();
  const mustInstall = isMobile && !installed && !blockedByEnv;

  return { device, installed, mustInstall, installPromptEvent, triggerInstall };
}
