/*
 * MediReach service worker (spec §3.2 PWA, §10 SOS push).
 * Handles incoming push messages — rendering the SOS alert with sound/vibration
 * where the platform allows — and focuses the app on notification click.
 */
self.addEventListener("push", (event) => {
  let data = { title: "MediReach", body: "", url: "/app" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    /* keep defaults */
  }

  const options = {
    body: data.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "medireach-sos",
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    // Carry GPS + clinic address through so a future update can deep-link to a map.
    data: {
      url: (data.data && data.data.url) || data.url || "/app",
      gps: data.data ? data.data.gps : null,
      clinicAddress: data.data ? data.data.clinicAddress : "",
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Take control promptly so push works without a reload.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
