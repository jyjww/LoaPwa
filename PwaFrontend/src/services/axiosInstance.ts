import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

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
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
