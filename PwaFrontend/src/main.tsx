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

// PWA: 서비스 워커 등록
/*if (import.meta.env.MODE === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('✅ Service Worker registered'))
      .catch(console.error);
  });
}*/

window.addEventListener('DOMContentLoaded', checkPWAInstall);

// React App 렌더링
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
