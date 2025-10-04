// src/hooks/usePushToggle.ts
import { useEffect, useState } from 'react';
import { issueFcmTokenWithVapid, deleteFcmToken } from '@/lib/firebase';

type State = {
  enabled: boolean;
  permission: NotificationPermission;
  loading: boolean;
  error?: string;
};

export function usePushToggle() {
  const buildHeaders = () => {
    const auth = localStorage.getItem('access_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = `Bearer ${auth}`;
    return headers;
  };

  const [state, setState] = useState<State>({
    enabled: !!localStorage.getItem('fcm_token'),
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    loading: false,
  });

  useEffect(() => {
    const t = localStorage.getItem('fcm_token');
    setState((s) => ({ ...s, enabled: !!t }));
  }, []);

  const ensurePermission = async () => {
    if (!('Notification' in window)) throw new Error('이 브라우저는 알림을 지원하지 않습니다.');
    if (Notification.permission === 'denied') return 'denied' as const;
    if (Notification.permission === 'default') {
      const res = await Notification.requestPermission();
      setState((s) => ({ ...s, permission: res }));
      return res;
    }
    setState((s) => ({ ...s, permission: 'granted' }));
    return 'granted' as const;
  };

  // ✅ 인자 제거
  const enable = async (): Promise<void> => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const perm = await ensurePermission();
      if (perm !== 'granted') {
        throw new Error('알림 권한이 필요합니다. 브라우저/OS 설정에서 허용해 주세요.');
      }

      const token = await issueFcmTokenWithVapid();
      if (!token) throw new Error('이 환경에서는 웹 푸시가 지원되지 않습니다.');

      localStorage.setItem('fcm_token', token);

      // 서버가 JwtAuthGuard로 사용자 식별 → userId 전송 불필요
      await fetch(`${import.meta.env.VITE_API_URL}/fcm/register`, {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify({ token }),
      });

      setState((s) => ({ ...s, enabled: true }));
    } catch (e: any) {
      setState((s) => ({ ...s, error: e?.message || String(e) }));
      throw e;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  const disable = async (): Promise<void> => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const token = localStorage.getItem('fcm_token') || undefined;
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/fcm/unregister`, {
          method: 'POST',
          credentials: 'include',
          headers: buildHeaders(),
          body: JSON.stringify({ token }),
        });
      }
      await deleteFcmToken();

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
      }

      localStorage.removeItem('fcm_token');
      setState((s) => ({ ...s, enabled: false }));
    } catch (e: any) {
      setState((s) => ({ ...s, error: e?.message || String(e) }));
      throw e;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  return { ...state, enable, disable, ensurePermission };
}
