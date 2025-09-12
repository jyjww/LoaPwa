// ===== Cache (버전 바꿔주면 강제 갱신) =====
const CACHE = 'loa-sw-v2';
const PRECACHE = ['/', '/index.html'];

// install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

// activate (이전 캐시 정리)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// fetch (same-origin GET만 캐시)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const clone = res.clone();
          const cache = await caches.open(CACHE);
          cache.put(req, clone);
        }
        return res;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })(),
  );
});

// ===== Firebase Cloud Messaging (background handler) =====
// compat 스크립트 로드 (SW는 importScripts 사용)
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// ⚠️ 반드시 리터럴 값으로 채우기 (ENV 사용 X)
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

// 백그라운드 푸시 수신
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || '알림';
  const options = {
    body: notif.body || data.body || '',
    icon: notif.icon || data.icon || '/icons/icon-192.png',
    badge: data.badge,
    image: data.image,
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
      const target = new URL(url, self.location.origin).href;
      let client = all.find((c) => c.url === target);
      if (client) {
        await client.focus();
        client.postMessage({ type: 'PUSH_CLICK', url: target });
      } else {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
