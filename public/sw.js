// Service Worker — Dojo Control (Push + Share Target + iOS PWA)
const SW_VERSION = '3.0.0';

// ─── Notification type configuration ───
const TYPE_CONFIG = {
  payment: {
    icon: '/icons/payment.png',
    badge: '/icons/badge.png',
    actions: [{ action: 'open', title: '💳 Ver pagamento' }],
  },
  warning: {
    icon: '/icons/warning.png',
    badge: '/icons/badge.png',
    actions: [{ action: 'open', title: '⚠️ Verificar' }],
  },
  training: {
    icon: '/icons/training.png',
    badge: '/icons/badge.png',
    actions: [{ action: 'open', title: '🥋 Ver agenda' }],
  },
  announcement: {
    icon: '/icons/info.png',
    badge: '/icons/badge.png',
    actions: [{ action: 'open', title: '📢 Ver aviso' }],
  },
  info: {
    icon: '/icons/info.png',
    badge: '/icons/badge.png',
    actions: [],
  },
  level_up: {
    icon: '/icons/info.png',
    badge: '/icons/badge.png',
    actions: [{ action: 'open', title: '⬆️ Ver progresso' }],
  },
  default: {
    icon: '/favicon.png',
    badge: '/favicon.png',
    actions: [],
  },
};

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
  let data = { title: 'Dojo Control', body: 'Nova notificação', url: '/', icon: '/favicon.png', type: 'default' };

  try {
    if (event.data) {
      const raw = event.data.text();
      console.log('[SW] Push payload length:', raw.length);
      try {
        const parsed = JSON.parse(raw);
        data = { ...data, ...parsed };
      } catch (_) {
        data.body = raw;
      }
    }
  } catch (e) {
    console.error('[SW] Error reading push data:', e);
  }

  const typeKey = data.type && TYPE_CONFIG[data.type] ? data.type : 'default';
  const config = TYPE_CONFIG[typeKey];

  const options = {
    body: data.body,
    icon: data.icon || config.icon,
    badge: config.badge || '/favicon.png',
    tag: 'dojo-' + (typeKey !== 'default' ? typeKey + '-' : '') + Date.now(),
    renotify: true,
    requireInteraction: typeKey === 'payment' || typeKey === 'warning',
    data: { url: data.url || '/' },
    actions: config.actions,
    ...(data.image ? { image: data.image } : {}),
    ...(isIOS() ? {} : { vibrate: [200, 100, 200] }),
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(url);
          } else {
            client.postMessage({ type: 'NAVIGATE', url });
          }
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── Auto re-subscribe when browser refreshes the push subscription ───
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] pushsubscriptionchange fired');
  event.waitUntil(
    (async () => {
      try {
        const oldSub = event.oldSubscription;
        const newSub = event.newSubscription || await self.registration.pushManager.subscribe(
          oldSub ? { userVisibleOnly: true, applicationServerKey: oldSub.options.applicationServerKey } : { userVisibleOnly: true }
        );

        if (newSub) {
          const subJSON = newSub.toJSON();
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of allClients) {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: subJSON,
              oldEndpoint: oldSub?.endpoint || null,
            });
          }
        }
      } catch (e) {
        console.error('[SW] Failed to re-subscribe on pushsubscriptionchange:', e);
      }
    })()
  );
});

// ─── Share Target Handler (iOS + Android) ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

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

    return Response.redirect('/mensalidade?shared=1', 303);
  } catch (error) {
    console.error('[SW] Share target error:', error);
    return Response.redirect('/mensalidade', 303);
  }
}

// ─── Utility ───
function isIOS() {
  try {
    return /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '');
  } catch {
    return false;
  }
}
