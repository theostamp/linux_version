/**
 * Service Worker για Push Notifications
 * New Concierge Chat System
 */

const CACHE_NAME = 'new-concierge-chat-v1';
const DEFAULT_NOTIFICATION_URL = '/chat';
const ALLOWED_HOSTS = new Set([
  'newconcierge.app',
  'localhost',
  '127.0.0.1',
  '0.0.0.0'
]);
const ALLOWED_HOST_SUFFIXES = ['.newconcierge.app', '.localhost'];

const isAllowedHost = (hostname) => {
  if (!hostname) {
    return false;
  }
  if (ALLOWED_HOSTS.has(hostname)) {
    return true;
  }
  return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
};

const normalizeNotificationUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_NOTIFICATION_URL;
  }

  try {
    const parsed = new URL(rawUrl, self.location.origin);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== 'http:' && protocol !== 'https:') {
      return DEFAULT_NOTIFICATION_URL;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname === self.location.hostname) {
      return parsed.pathname + parsed.search + parsed.hash;
    }

    if (isAllowedHost(hostname)) {
      return parsed.href;
    }
  } catch (e) {
    console.warn('[Service Worker] Invalid notification URL:', rawUrl);
  }

  return DEFAULT_NOTIFICATION_URL;
};

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  let data = {
    title: 'Νέο μήνυμα',
    body: 'Έχετε ένα νέο μήνυμα',
    icon: '/icons/chat-icon.png',
    badge: '/icons/badge-icon.png',
    tag: 'chat-notification',
    data: {
      url: '/chat'
    }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/chat-icon.png',
    badge: data.badge || '/icons/badge-icon.png',
    tag: data.tag || 'chat-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: data.data || { url: DEFAULT_NOTIFICATION_URL },
    actions: [
      {
        action: 'open',
        title: 'Άνοιγμα'
      },
      {
        action: 'dismiss',
        title: 'Απόρριψη'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = normalizeNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline messages (future)
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    console.log('[Service Worker] Syncing messages...');
    // TODO: Implement offline message queue sync
  }
});
