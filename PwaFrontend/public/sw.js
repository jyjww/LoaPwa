// ===== Cache (버전 바꾸면 강제 갱신) =====
const CACHE = 'loa-sw-v2';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ✅ 1) 네비게이션 요청(index.html 포함)은 항상 네트워크 우선
  //    (오프라인일 때만 캐시로 폴백)
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          return fresh;
        } catch {
          // 오프라인 폴백: 마지막 index.html 캐시가 있으면 반환
          const cached = await caches.match('/index.html');
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // ✅ 2) 그 외 정적 자원(JS/CSS/이미지)은 캐시-우선(없으면 네트워크)
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
        // 오프라인 폴백
        return (await caches.match('/')) || Response.error();
      }
    })(),
  );
});

// ===== Inbox IDB (백그라운드 푸시를 로컬에 적재) =====
const INBOX_DB = 'push_inbox_db';
const INBOX_STORE = 'messages';
const INBOX_MAX = 300;

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(INBOX_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(INBOX_STORE)) {
        const store = db.createObjectStore(INBOX_STORE, { keyPath: 'ts' }); // ts를 키로 사용
        store.createIndex('ts', 'ts', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbAddMessage(msg) {
  const db = await idbOpen();
  await new Promise((res, rej) => {
    const tx = db.transaction(INBOX_STORE, 'readwrite');
    tx.objectStore(INBOX_STORE).put(msg);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function idbTrim(limit = INBOX_MAX) {
  const db = await idbOpen();
  await new Promise((res, rej) => {
    const tx = db.transaction(INBOX_STORE, 'readwrite');
    const store = tx.objectStore(INBOX_STORE).index('ts');

    // 오래된 것부터 지우기 위해 역방향이 아닌 정방향 커서 사용
    const req = store.openCursor();
    const items = [];
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        items.push(cur.primaryKey);
        cur.continue();
      } else {
        const over = Math.max(0, items.length - limit);
        if (over > 0) {
          const txx = db.transaction(INBOX_STORE, 'readwrite');
          const s = txx.objectStore(INBOX_STORE);
          for (let i = 0; i < over; i++) s.delete(items[i]);
          txx.oncomplete = () => res();
          txx.onerror = () => rej(txx.error);
        } else res();
      }
    };
    req.onerror = () => rej(req.error);
  });
}

// ===== Firebase Cloud Messaging (background handler) =====
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDmY7j0O4bTce7rOa1nLByuMw8gfC-nOE0',
  authDomain: 'loapwa-d0c74.firebaseapp.com',
  projectId: 'loapwa-d0c74',
  storageBucket: 'loapwa-d0c74.appspot.com', // ← Storage 쓸 때 올바른 도메인 권장
  messagingSenderId: '25420661450',
  appId: '1:25420661450:web:628f68e8386f87fbaaea33',
  measurementId: 'G-1EQ7F5C4LJ',
});

const messaging = firebase.messaging();

// ➊ 공통 정규화 함수: FCM/표준 푸시를 하나의 형태로 맞춤
function normalizePayload(input) {
  const raw = input || {};
  const notif = raw.notification || {}; // FCM의 notification
  const data = raw.data || raw; // 표준 푸시는 data 대신 최상위에 옴
  return {
    title: notif.title || data.title || '알림',
    body: notif.body || data.body || '',
    url: data.url || raw?.fcmOptions?.link || '/', // 딥링크 우선순위
    type: data.type || 'ALERT',
    raw, // 원본 보관(디버그용)
    ts: Date.now(),
  };
}

// ➋ FCM 백그라운드 메시지 (기존 onBackgroundMessage의 "내용"을 이걸로 교체)
messaging.onBackgroundMessage((payload) => {
  const p = normalizePayload(payload);
  if (!p.ts) p.ts = Date.now();

  // 로컬 저장
  idbAddMessage(p)
    .then(() => idbTrim())
    .catch(() => {});

  // 열려 있는 모든 탭에 "도착" 알림
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((list) => list.forEach((c) => c.postMessage({ type: 'PUSH_RECEIVED', payload: p })));

  // OS 알림
  self.registration.showNotification(p.title, {
    body: p.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: p.url },
  });
});

// ➌ 표준 Web Push (기존 push 핸들러의 "내용"을 이걸로 교체)
self.addEventListener('push', (event) => {
  let raw = {};
  try {
    raw = event.data?.json() ?? {};
  } catch {
    raw = { body: event.data?.text() || '' };
  }
  const p = normalizePayload(raw);
  if (!p.ts) p.ts = Date.now();

  event.waitUntil(
    (async () => {
      // 로컬 저장
      await idbAddMessage(p)
        .then(() => idbTrim())
        .catch(() => {});

      // 열려 있는 탭에 전달
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      list.forEach((c) => c.postMessage({ type: 'PUSH_RECEIVED', payload: p }));

      // OS 알림
      await self.registration.showNotification(p.title, {
        body: p.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        data: { url: p.url },
      });
    })(),
  );
});

// 알림 클릭 (단일 리스너)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const absolute = new URL(targetUrl, self.location.origin).href;

      for (const c of all) {
        // 이미 열린 탭 있으면 포커스
        if (c.url === absolute && 'focus' in c) {
          await c.focus();
          c.postMessage({ type: 'PUSH_CLICK', url: absolute });
          return;
        }
      }
      // 없으면 새 창
      const newClient = await self.clients.openWindow(absolute);
      if (newClient) newClient.postMessage({ type: 'PUSH_CLICK', url: absolute });
    })(),
  );
});
