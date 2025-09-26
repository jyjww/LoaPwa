import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const checkPWAInstall = () => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone; // iOS 대응
  if (!isStandalone) {
    localStorage.setItem('showInstallPrompt', 'true');
  } else {
    localStorage.removeItem('showInstallPrompt');
  }
};

// PWA: 서비스 워커 등록 (prod에서만)
/*
if (import.meta.env.MODE === 'development' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`; // public/ 아래 파일
      const reg = await navigator.serviceWorker.register(swUrl, {
        scope: import.meta.env.BASE_URL,
      });
      console.log('✅ Service Worker registered:', reg.scope);
      // 나중에 FCM getToken에서 이 reg를 쓰고 싶다면 window에 붙여두면 편해요.
      (window as any)._swReg = reg;
    } catch (err) {
      console.error('❌ Service Worker register failed:', err);
    }
  });
}
*/

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_SW_DEV === 'true') {
    // 기존 등록물/캐시를 깨끗이 (한 번만)
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    caches?.keys?.().then((keys) => keys.forEach((k) => caches.delete(k)));

    // 🔹 dev 전용 SW 등록 (푸시만, 캐싱/Fetch 핸들러 없음)
    navigator.serviceWorker
      .register('/sw-dev.js', { scope: '/push/' })
      .then((reg) => console.log('DEV SW registered:', reg.scope))
      .catch((err) => console.error('DEV SW register error', err));
  } else if (import.meta.env.PROD) {
    // 🔹 프로덕션에서만 캐싱 포함 SW
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.error('SW register error', err));
  }
}

window.addEventListener('DOMContentLoaded', checkPWAInstall);

// React App 렌더링
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
