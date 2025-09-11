const API = import.meta.env.VITE_API_URL;

async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let token: string | null = localStorage.getItem('access_token');
  // console.log('[authFetch] 시작 - 현재 accessToken:', token);

  const doFetch = async (withAuth = true) => {
    const headers: HeadersInit = {
      ...(withAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    };

    // console.log('[authFetch] 요청 보내기:', input, 'headers:', headers);

    return fetch(`${API}${input}`, {
      ...init,
      headers,
      credentials: 'include', // ✅ refreshToken 쿠키 포함
    });
  };

  let res = await doFetch();

  if (res.status === 401) {
    console.warn('[authFetch] ❌ 401 발생. refresh 시도 중...');
    const refreshRes = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshRes.ok) {
      // console.log('[authFetch] ✅ refresh 성공');

      const data = await refreshRes.json();
      token = data.accessToken as string; // ✅ 여기서 무조건 string

      // console.log('[authFetch] 새 accessToken 발급:', token);

      localStorage.setItem('access_token', token);

      res = await doFetch();
    } else {
      console.error('[authFetch] ❌ refresh 실패. 세션 만료');
      localStorage.removeItem('access_token');
      window.location.href = '/login';
      throw new Error('세션 만료됨. 다시 로그인하세요.');
    }
  }

  // console.log('[authFetch] 최종 응답 status:', res.status);
  return res;
}

export default authFetch;
