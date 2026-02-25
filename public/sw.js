// Service Worker — Dojo Control (Push + Share Target)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// ─── Push Notifications ───
self.addEventListener('push', (event) => {
  let data = { title: 'Dojo Control', body: 'Nova notificação', url: '/', icon: '/favicon.png' };
  try {
    if (event.data) {
      const raw = event.data.text();
      console.log('[SW] Push raw payload length:', raw.length);
      try {
        const parsed = JSON.parse(raw);
        data = { ...data, ...parsed };
      } catch (jsonErr) {
        console.log('[SW] Payload is not JSON, using as body text');
        data.body = raw;
      }
    }
  } catch (e) {
    console.error('[SW] Error reading push data:', e);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/favicon.png',
      badge: '/favicon.png',
      data: { url: data.url || '/' },
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── Share Target Handler ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/compartilhar' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const file = formData.get('file');

        // Store shared file in Cache API for the page to pick up
        if (file) {
          const cache = await caches.open('shared-files');
          // Store file as a response with metadata headers
          const response = new Response(file, {
            headers: {
              'Content-Type': file.type,
              'X-File-Name': file.name,
              'X-Shared-At': new Date().toISOString(),
            },
          });
          await cache.put('/shared-file-latest', response);
        }

        // Redirect to the payments page where the upload dialog will auto-open
        return Response.redirect('/mensalidade?shared=1', 303);
      })()
    );
    return;
  }
});
