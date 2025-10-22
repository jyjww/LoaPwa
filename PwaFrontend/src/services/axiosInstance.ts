import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { getCurrentAnonId } from './anonService';

// export const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export const API = (import.meta.env.VITE_API_URL || `${location.origin}/api`).replace(/\/+$/, '');

type JwtPayload = { exp: number };

const axiosInstance = axios.create({
  baseURL: API,
  withCredentials: true, // refreshToken 쿠키 포함
});

const getAccessToken = () => localStorage.getItem('access_token');
const setAccessToken = (token: string) => localStorage.setItem('access_token', token);

const isTokenExpiringSoon = (token: string | null, thresholdSec = 60) => {
  if (!token) return true;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    // exp는 초 단위, Date.now()는 밀리초 단위 → 나눠줌
    return decoded.exp - Date.now() / 1000 < thresholdSec;
  } catch {
    return true;
  }
};

const refreshAccessToken = async () => {
  // 로그인 UI가 비활성화된 경우 refresh 요청을 하지 않음
  if (import.meta.env.VITE_LOGIN_UI === 'off') {
    return null;
  }

  try {
    const res = await axios.post(`${API}/auth/refresh`, {}, { withCredentials: true });
    const newToken = res.data.accessToken;
    if (newToken) {
      setAccessToken(newToken);
      return newToken;
    }
  } catch {
    console.warn('⚠️ refresh 실패');
  }
  return null;
};

// 요청 전 처리
axiosInstance.interceptors.request.use(async (config) => {
  let token = getAccessToken();

  if (isTokenExpiringSoon(token)) {
    token = await refreshAccessToken();
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // 로그인하지 않은 경우 익명 사용자 ID 헤더 추가 (쿠키에서 읽기)
    const anonId = getCurrentAnonId();
    if (anonId) {
      config.headers['X-Anon-Id'] = anonId;
    }
    // anonId가 없으면 헤더를 보내지 않음 (사용자가 직접 등록하도록 안내)
  }
  return config;
});

// 응답 후 처리 (401 자동 처리)
axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } else {
        localStorage.removeItem('access_token');
        // 로그인 UI가 활성화된 경우에만 로그인 페이지로 리다이렉트
        if (import.meta.env.VITE_LOGIN_UI !== 'off') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
