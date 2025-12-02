// public-app/public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: "AIzaSyBfuDwTuh2laCsiJoQxmFAwK5QSHUDqZH8",
  authDomain: "auth-django-414207.firebaseapp.com",
  projectId: "auth-django-414207",
  storageBucket: "auth-django-414207.firebasestorage.app",
  messagingSenderId: "549447386263",
  appId: "1:549447386263:web:c2bd717b34b3db074995d2",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // Path to app icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
