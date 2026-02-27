// Service Worker — Dojo Control (Push + Share Target + iOS PWA)
const SW_VERSION = '2.0.0';

self.addEventListener('install', (event) => {
  console.log('[SW] Install v' + SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate v' + SW_VERSION);
  event.waitUntil(clients.claim());
});

// ─── Push Notifications (compatible with iOS 16.4+ PWA) ───
self.addEventListener('push', (event) => {
  let data = { title: 'Dojo Control', body: 'Nova notificação', url: '/', icon: '/favicon.png' };

  try {
    if (event.data) {
      const raw = event.data.text();
      console.log('[SW] Push payload length:', raw.length);
      try {
        const parsed = JSON.parse(raw);
        data = { ...data, ...parsed };
      } catch (_) {
        // Payload is plain text — use as body
        data.body = raw;
      }
    }
  } catch (e) {
    console.error('[SW] Error reading push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.url || '/' },
    // iOS PWA requires these to be simple; avoid unsupported options
    ...(isIOS() ? {} : { vibrate: [200, 100, 200] }),
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing window
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          // navigate() may not be available on all clients (e.g., iOS)
          if ('navigate' in client) {
            client.navigate(url);
          } else {
            // Fallback: post message to client to navigate
            client.postMessage({ type: 'NAVIGATE', url });
          }
          return;
        }
      }
      // No existing window — open a new one
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── Share Target Handler (iOS + Android) ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept share target POST requests
  if (url.pathname === '/compartilhar' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (file && file instanceof File) {
      const cache = await caches.open('shared-files');

      // Read the file into an ArrayBuffer first for iOS compatibility
      // (iOS Safari may not correctly clone File objects across contexts)
      const arrayBuffer = await file.arrayBuffer();

      const response = new Response(arrayBuffer, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name || 'comprovante'),
          'X-Shared-At': new Date().toISOString(),
        },
      });
      await cache.put('/shared-file-latest', response);
    }

    // Redirect to the payments page
    return Response.redirect('/mensalidade?shared=1', 303);
  } catch (error) {
    console.error('[SW] Share target error:', error);
    // Even on error, redirect to avoid blank screen
    return Response.redirect('/mensalidade', 303);
  }
}

// ─── Utility ───
function isIOS() {
  // Service worker context doesn't have navigator.userAgent in all cases,
  // but we can safely check if vibrate-like features should be skipped
  try {
    return /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '');
  } catch {
    return false;
  }
}
