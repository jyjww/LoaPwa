// src/components/auth/TokenRefresher.tsx
import { useEffect } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const TokenRefresh = () => {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // refreshToken 쿠키 포함
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('access_token', data.accessToken);
          //console.log('[refresh] ✅ accessToken 갱신 성공:', data.accessToken);
        } else {
          console.warn('[refresh] ⚠️ refresh 실패, 상태코드:', res.status);
        }
      } catch (err) {
        console.error('[refresh] ❌ 에러 발생:', err);
      }
    }, 55 * 1000); // 55초마다 실행

    return () => clearInterval(interval);
  }, []);

  return null; // UI 필요 없음
};

export default TokenRefresh;
