// 설치/활성화
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// (선택) 아주 기초 캐시: 첫 화면만 캐시
const CACHE = 'loa-pwa-v1';
const PRECACHE = ['/', '/index.html'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            // 정적 파일만 캐시 (기본 예시)
            if (res.ok && request.url.startsWith(self.location.origin)) {
              const resClone = res.clone();
              caches.open(CACHE).then((c) => c.put(request, resClone));
            }
            return res;
          })
          .catch(() => caches.match('/')),
    ),
  );
});

// (옵션) 푸시 수신 (서버 붙인 후 동작)
self.addEventListener('push', (e) => {
  const data = e.data?.json?.() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || '알림', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      data: data.url || '/',
    }),
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification?.data || '/'));
});
