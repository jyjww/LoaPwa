// public/firebase-messaging-sw.js

// // ===== Cache (버전 바꾸면 강제 갱신) =====
const CACHE = 'loa-sw-v2';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  // 무한 새로고침 방지를 위해 즉시 skipWaiting은 하지 않음
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // 자동 clients.claim()도 즉시 호출하지 않음 (초기 컨트롤러 교체 충돌 최소화)
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
          if (!fresh.ok) {
            // 404면 SPA 라우터로 처리하기 위해 index.html로 폴백
            const cached = await caches.match('/index.html');
            return cached || fresh; // 캐시가 있으면 SPA 라우터로 처리
          }
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

// 메시지 처리 직렬화를 위한 전역 락
let messageProcessingLock = false;
const messageQueue = [];

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(INBOX_DB, 2); // 버전 업그레이드
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(INBOX_STORE)) {
        const store = db.createObjectStore(INBOX_STORE, { keyPath: 'ts' }); // ts를 키로 사용
        store.createIndex('ts', 'ts', { unique: true });
        store.createIndex('messageId', 'raw.messageId', { unique: false });
        store.createIndex('fcmMessageId', 'raw.fcmMessageId', { unique: false });
      } else {
        // 기존 스토어에 인덱스 추가
        const tx = req.transaction;
        const store = tx.objectStore(INBOX_STORE);
        if (!store.indexNames.contains('messageId')) {
          store.createIndex('messageId', 'raw.messageId', { unique: false });
        }
        if (!store.indexNames.contains('fcmMessageId')) {
          store.createIndex('fcmMessageId', 'raw.fcmMessageId', { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 메시지 처리 큐에 추가 (직렬화)
async function queueMessage(msg) {
  return new Promise(async (resolve, reject) => {
    messageQueue.push({ msg, resolve, reject });
    await processMessageQueue();
  });
}

// 큐 처리 (한 번에 하나씩)
async function processMessageQueue() {
  if (messageProcessingLock || messageQueue.length === 0) {
    return;
  }

  messageProcessingLock = true;

  while (messageQueue.length > 0) {
    const { msg, resolve, reject } = messageQueue.shift();

    try {
      await idbAddMessageInternal(msg);
      resolve();
    } catch (error) {
      reject(error);
    }
  }

  messageProcessingLock = false;
}

// 실제 메시지 저장 로직 (내부 함수)
async function idbAddMessageInternal(msg) {
  const messageId = msg.raw?.messageId || msg.raw?.fcmMessageId;

  const db = await idbOpen();
  await new Promise((res, rej) => {
    const tx = db.transaction(INBOX_STORE, 'readwrite');
    const store = tx.objectStore(INBOX_STORE);

    if (messageId) {
      // 기존 항목 찾기 및 삭제
      const index = store.index('messageId');
      const getReq = index.get(messageId);

      getReq.onsuccess = () => {
        if (getReq.result) {
          // 기존 항목이 있으면 삭제 후 새로 추가
          store.delete(getReq.result.ts);
          console.log('🗑️ Removed duplicate message:', messageId);
        }

        // 새 메시지 추가
        store.put(msg);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      };

      getReq.onerror = () => {
        // 인덱스 검색 실패 시 그냥 추가
        store.put(msg);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      };
    } else {
      // messageId가 없으면 그냥 추가
      store.put(msg);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    }
  });
}

// 외부에서 호출하는 함수 (큐에 추가)
async function idbAddMessage(msg) {
  return queueMessage(msg);
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

// ➌ 표준 Web Push (FCM 사용 시 비활성화 - 중복 방지)
// FCM onBackgroundMessage가 이미 처리하므로 push 이벤트는 무시
self.addEventListener('push', (event) => {
  // FCM을 사용 중이므로 표준 push 이벤트는 무시
  // 중복 알림 방지를 위해 아무것도 하지 않음
  console.log('📱 Push event received but ignored (FCM handles it)');
});

// 알림 클릭 (단일 리스너) - 페이로드 URL 사용 + 직접 네비게이션
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // 1) 우선순위: notification.data.url → 기본 '/'
  const clickUrl = event.notification?.data?.url || '/';
  const absoluteUrl = new URL(clickUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      try {
        const allClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        // 2) 이미 열려있는 동일 오리진 탭이 있으면 그 탭으로 "직접" 이동(navigate) + 포커스
        for (const client of allClients) {
          if (client.url.startsWith(self.location.origin)) {
            if ('navigate' in client) {
              await client.navigate(absoluteUrl);
            } else {
              // navigate 미지원 브라우저 대비
              client.postMessage({ type: 'PUSH_CLICK', url: absoluteUrl });
            }
            await client.focus();
            console.log('📱 Focused existing tab and navigated to:', absoluteUrl);
            return;
          }
        }

        // 3) 없으면 새 창 열기
        const newClient = await self.clients.openWindow(absoluteUrl);
        if (newClient) {
          // 대부분 iOS/안드에서 openWindow만으로 충분
          console.log('📱 Opened new window:', absoluteUrl);
        } else {
          console.warn('📱 Failed to open new window, falling back to browser default');
        }
      } catch (error) {
        console.error('📱 Error handling notification click:', error);
      }
    })(),
  );
});

// 개발/테스트용 메시지 핸들러
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (e.data?.type === 'TEST_NOTIFICATION_CLICK') {
    // 개발 환경에서 notificationclick 이벤트 테스트
    console.log('🧪 Testing notification click handler...');

    // 테스트용 URL (페이로드 URL 사용)
    const clickUrl = '/favorites';
    const absoluteUrl = new URL(clickUrl, self.location.origin).href;

    (async () => {
      try {
        const allClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        for (const client of allClients) {
          if (client.url.startsWith(self.location.origin)) {
            if ('navigate' in client) {
              await client.navigate(absoluteUrl);
            } else {
              client.postMessage({ type: 'PUSH_CLICK', url: absoluteUrl });
            }
            await client.focus();
            console.log('🧪 Test: Focused existing tab and navigated to:', absoluteUrl);
            return;
          }
        }

        const newClient = await self.clients.openWindow(absoluteUrl);
        if (newClient) {
          console.log('🧪 Test: Opened new window:', absoluteUrl);
        }
      } catch (error) {
        console.error('🧪 Test error:', error);
      }
    })();
  }
});
