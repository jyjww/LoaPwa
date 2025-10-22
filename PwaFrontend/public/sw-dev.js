// ===== DEV SW: 캐시/페치 미사용 (HMR 충돌 방지) =====
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
