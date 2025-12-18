/**
 * Service Worker για Push Notifications
 * New Concierge Chat System
 */

const CACHE_NAME = 'new-concierge-chat-v1';

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
    data: data.data || { url: '/chat' },
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
  
  const urlToOpen = event.notification.data?.url || '/chat';
  
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

