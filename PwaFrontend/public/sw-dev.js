// ===== DEV SW: 캐시/페치 미사용 (HMR 충돌 방지) =====
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// ===== Firebase Cloud Messaging (background handler) =====
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// ⚠️ 환경변수 쓰지 말고 리터럴로 (SW는 번들 밖 정적파일)
firebase.initializeApp({
  apiKey: 'AIzaSyDmY7j0O4bTce7rOa1nLByuMw8gfC-nOE0',
  authDomain: 'loapwa-d0c74.firebaseapp.com',
  projectId: 'loapwa-d0c74',
  storageBucket: 'loapwa-d0c74.firebasestorage.app',
  messagingSenderId: '25420661450',
  appId: '1:25420661450:web:628f68e8386f87fbaaea33',
  measurementId: 'G-1EQ7F5C4LJ',
});

const messaging = firebase.messaging();

// FCM 백그라운드 수신
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || '알림';
  const options = {
    body: notif.body || data.body || '',
    icon: notif.icon || data.icon || '/icons/icon-192.png',
    image: data.image,
    badge: data.badge,
    data: { url: data.url || '/' },
  };
  self.registration.showNotification(title, options);
});

// 클릭 시 포커스/열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const absolute = new URL(url, self.location.origin).href;
      const client = all.find((c) => c.url === absolute);
      if (client) {
        await client.focus();
        try {
          client.postMessage({ type: 'PUSH_CLICK', url: absolute });
        } catch {}
      } else {
        await self.clients.openWindow(absolute);
      }
    })(),
  );
});
