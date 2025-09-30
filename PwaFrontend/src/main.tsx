import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// --- PWA 설치 배너 플래그 갱신 (1회용) ---
function updateInstallPromptFlag() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  if (!isStandalone) localStorage.setItem('showInstallPrompt', 'true');
  else localStorage.removeItem('showInstallPrompt');
}

// DOM 로드 시 1회 실행
window.addEventListener('DOMContentLoaded', updateInstallPromptFlag, { once: true });

// --- Service Worker 등록/업데이트 ---
if ('serviceWorker' in navigator) {
  // 새 SW가 컨트롤러가 되면 1회만 새로고침 (무한루프 방지)
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloaded) {
      reloaded = true;
      location.reload();
    }
  });

  (async () => {
    try {
      if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_SW_DEV === 'true') {
        // 개발용: 푸시만 시험하고 싶을 때
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ('caches' in self) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        const reg = await navigator.serviceWorker.register('/sw-dev.js', { scope: '/push/' });
        console.log('DEV SW registered:', reg.scope);
      } else if (import.meta.env.PROD) {
        // 프로덕션: 정식 SW (앱 전체 스코프)
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('SW registered:', reg.scope);
      }
    } catch (err) {
      console.error('SW register error', err);
    }
  })();
}

// --- React App 렌더링 ---
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
