// Push handler injetado no Service Worker do Miva (via vite-plugin-pwa importScripts).
// Recebe notificações Web Push e exibe pra usuária mesmo com o app fechado.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Miva", body: event.data ? event.data.text() : "Você tem um lembrete" };
  }

  const title = payload.title || "Miva 💕";
  const options = {
    body: payload.body || "Você tem um compromisso chegando.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: payload.tag || "miva-lembrete",
    data: { url: payload.url || "/agenda" },
    vibrate: [120, 60, 120],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/agenda";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
