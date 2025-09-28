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

// PWA 설치 안내
window.addEventListener('DOMContentLoaded', () => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  if (!isStandalone) localStorage.setItem('showInstallPrompt', 'true');
  else localStorage.removeItem('showInstallPrompt');
});

// 서비스워커 등록
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_SW_DEV === 'true') {
    // (선택) 개발용: 푸시만 테스트할 때
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    caches?.keys?.().then((keys) => keys.forEach((k) => caches.delete(k)));
    navigator.serviceWorker
      .register('/sw-dev.js', { scope: '/push/' })
      .then((reg) => console.log('DEV SW registered:', reg.scope))
      .catch((err) => console.error('DEV SW register error', err));
  } else if (import.meta.env.PROD) {
    // 프로덕션: 캐싱/푸시 포함 정식 SW
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
