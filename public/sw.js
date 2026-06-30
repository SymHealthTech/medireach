/*
 * MediReach service worker (spec §3.2 PWA, §10 SOS push).
 * Handles incoming push messages and forwards SOS alerts to open app clients
 * so they can show an in-app modal alarm. Falls back to a system notification
 * when the app is in the background.
 */
self.addEventListener("push", (event) => {
  let data = { title: "MediReach", body: "", url: "/app" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    /* keep defaults */
  }

  const isSos = data.topic === "medireach-sos";

  // Forward to every open app window so the in-app alarm modal can trigger.
  if (isSos) {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) =>
          c.postMessage({
            type: "SOS_ALERT",
            id: (data.data && data.data.eventId) || null,
            title: data.title,
            body: data.body,
            gps: (data.data && data.data.gps) || null,
            clinicAddress: (data.data && data.data.clinicAddress) || "",
          }),
        );
      }),
    );
  }

  const options = {
    body: data.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "medireach-sos",
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: (data.data && data.data.url) || data.url || "/app",
      gps: data.data ? data.data.gps : null,
      clinicAddress: data.data ? data.data.clinicAddress : "",
      isSos,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const url = notifData.url || "/app";
  const isSos = notifData.isSos;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find((c) => c.url.includes("/app")) || clients[0];
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
        if (isSos) {
          existing.postMessage({
            type: "SOS_ALERT",
            id: notifData.eventId || null,
            title: event.notification.title,
            body: event.notification.body,
            gps: notifData.gps || null,
            clinicAddress: notifData.clinicAddress || "",
          });
        }
        return;
      }
      await self.clients.openWindow(url);
    }),
  );
});

// Take control promptly so push works without a reload.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
