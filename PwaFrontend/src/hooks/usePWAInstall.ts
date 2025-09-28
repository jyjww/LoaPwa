import { useEffect, useRef, useState } from 'react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function usePWAInstall() {
  const deferredRef = useRef<BIPEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as any).standalone === true;

  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BIPEvent;
      setCanInstall(true);
      localStorage.setItem('showInstallPrompt', 'true'); // 배너 띄울 플래그
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      localStorage.removeItem('showInstallPrompt');
      deferredRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    const ev = deferredRef.current;
    if (!ev) return false;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    // 유저 선택 이후엔 재사용 불가
    deferredRef.current = null;
    setCanInstall(false);
    if (outcome === 'accepted') {
      localStorage.removeItem('showInstallPrompt');
    }
    return outcome === 'accepted';
  };

  return { canInstall, installed, isStandalone, isiOS, promptInstall };
}
