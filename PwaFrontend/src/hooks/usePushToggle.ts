// src/hooks/usePushToggle.ts
import { useEffect, useState } from 'react';
import { issueFcmTokenWithVapid, deleteFcmToken } from '@/lib/firebase';
import { getCurrentAnonId } from '@/services/anonService';

type State = {
  enabled: boolean;
  permission: NotificationPermission;
  loading: boolean;
  error?: string;
};

export function usePushToggle() {
  const buildHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // 익명 사용자 ID 헤더 추가
    const anonId = getCurrentAnonId();
    if (anonId) {
      headers['X-Anon-Id'] = anonId;
    }

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
    console.log('🚀 usePushToggle enable 시작');
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      // 익명 사용자 ID 확인
      const anonId = getCurrentAnonId();
      console.log('🔍 enable에서 anonId 확인:', anonId);
      if (!anonId) {
        throw new Error('임시 사용자 등록이 필요합니다.');
      }

      const perm = await ensurePermission();
      console.log('🔔 권한 확인:', perm);
      if (perm !== 'granted') {
        throw new Error('알림 권한이 필요합니다. 브라우저/OS 설정에서 허용해 주세요.');
      }

      console.log('🎫 FCM 토큰 발급 중...');
      const token = await issueFcmTokenWithVapid();
      console.log('🎫 FCM 토큰:', token ? '발급됨' : '실패');
      if (!token) throw new Error('이 환경에서는 웹 푸시가 지원되지 않습니다.');

      localStorage.setItem('fcm_token', token);

      console.log('📡 서버에 FCM 토큰 등록 중...');
      // 익명 사용자용 FCM 토큰 등록
      await fetch(`${import.meta.env.VITE_API_URL}/anon/fcm/register`, {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify({ token }),
      });
      console.log('✅ 서버 등록 완료');

      setState((s) => ({ ...s, enabled: true }));
      console.log('🎉 enable 완료');
    } catch (e: any) {
      console.error('❌ enable 실패:', e);
      setState((s) => ({ ...s, error: e?.message || String(e) }));
      throw e;
    } finally {
      console.log('🔄 loading false로 설정');
      setState((s) => ({ ...s, loading: false }));
    }
  };

  const disable = async (): Promise<void> => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const token = localStorage.getItem('fcm_token') || undefined;
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/anon/fcm/unregister`, {
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
