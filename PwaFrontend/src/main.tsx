// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { inboxStore, type InboxMessage } from '@/stores/inboxStore';
import { idbGetAll, idbTrim, idbAdd } from '@/lib/inboxIdb';

/**
 * 1) PWA 설치 배너 플래그 (최초 1회)
 *    - 스탠드얼론이 아니면, 설치 배너를 보여주기 위한 플래그를 켠다.
 */
function updateInstallPromptFlag() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari PWA 전용 플래그
    (navigator as any).standalone === true;

  if (!isStandalone) localStorage.setItem('showInstallPrompt', 'true');
  else localStorage.removeItem('showInstallPrompt');
}
window.addEventListener('DOMContentLoaded', updateInstallPromptFlag, { once: true });

/**
 * 2) Service Worker 등록 + 교체 감지
 *    - controllerchange: 새 SW가 컨트롤러가 되면 1번만 새로고침(무한루프 방지)
 *    - 개발/운영에 따라 등록 파일 분기
 *    - (운영만) FCM 전용 SW도 함께 등록
 */
if ('serviceWorker' in navigator) {
  // 2-1) 새 컨트롤러 적용 시 1회 새로고침
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloaded) {
      reloaded = true;
      location.reload();
    }
  });

  // 2-2) 등록
  (async () => {
    try {
      if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_SW_DEV === 'true') {
        // ● 개발모드: 테스트용 SW로 교체(푸시/캐시 실험)
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));

        // 원한다면 캐시도 초기화
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }

        const devReg = await navigator.serviceWorker.register('/sw-dev.js', { scope: '/push/' });
        console.log('[SW] DEV registered:', devReg.scope);
      } else if (import.meta.env.PROD) {
        // ● 운영모드: 앱 전체 SW 등록
        const appReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[SW] App registered:', appReg.scope);

        // (선택) FCM 백그라운드 메시지 핸들러 SW
        //  - CI에서 public/firebase-messaging-sw.js를 생성해둔 경우만 등록됨
        try {
          const fcmReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('[SW] FCM registered:', fcmReg.scope);
        } catch (e) {
          // 파일이 없을 수도 있으니 경고만
          console.warn('[SW] FCM register skipped or failed:', e);
        }
      }
    } catch (err) {
      console.error('[SW] register error:', err);
    }
  })();

  /**
   * 3) SW → 메인 스레드 메시지 브리지
   *    - SW에서 postMessage({ type: 'PUSH_RECEIVED', payload })가 오면
   *      인박스 스토어에 적재하여 모달(알림함)에서 즉시 보이게 한다.
   *    - ts가 없으면 현재 시각으로 보정.
   */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (e: MessageEvent) => {
      if (e.data?.type === 'PUSH_RECEIVED') {
        const p = e.data.payload as InboxMessage; // {title, body, url, ts, ...}
        if (!p.ts) p.ts = Date.now();

        // 1) 영구 저장 (IndexedDB)
        try {
          await idbAdd(p);
          await idbTrim(300); // 오래된 항목 정리(옵션)
        } catch (err) {
          console.warn('[inbox] idbAdd failed', err);
        }

        // 2) UI/LocalStorage 동기화
        inboxStore.append(p);
      }
    });
  }
}

/**
 * 4) (선택) 앱 시작 시, 오프라인 수신분 복구
 *    - SW가 백그라운드에서 IndexedDB에 저장해둔 알림을 불러옴
 *    - inboxStore로 하이드레이트
 */
(async () => {
  try {
    const cached = await idbGetAll();
    inboxStore.setAll(cached);
  } catch {}
})();

(async () => {
  try {
    const messages = await idbGetAll(200); // 최신순 최대 200개
    inboxStore.setAll(messages);
    await idbTrim(300); // IDB 사이드에서도 오래된 것 정리(옵션)
  } catch (e) {
    console.warn('[inbox] hydrate failed', e);
  }
})();

/**
 * 5) React 앱 렌더링
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
