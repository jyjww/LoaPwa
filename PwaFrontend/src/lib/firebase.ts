// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, isSupported, getToken } from 'firebase/messaging';
import { deleteToken } from 'firebase/messaging';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
};

// ✅ 앱은 한번만 초기화
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ (선택) Analytics: 브라우저에서만 안전하게
export const getAnalyticsIfSupported = () => {
  if (typeof window === 'undefined' || !import.meta.env.VITE_FB_MEASUREMENT_ID) return null;
  try {
    return getAnalytics(app);
  } catch {
    return null;
  }
};

// ✅ (선택) FCM: 지원 브라우저일 때만
export const getMessagingIfSupported = async () => {
  return (await isSupported()) ? getMessaging(app) : null;
};

// ===== FCM Token Helper =====
export async function issueFcmTokenWithVapid(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const messaging = await getMessagingIfSupported();
    if (!messaging) return null;

    const vapidKey = import.meta.env.VITE_FB_VAPID_KEY as string | undefined;
    if (!vapidKey) {
      console.warn('VAPID 키가 설정되어 있지 않습니다 (VITE_FB_VAPID_KEY).');
      return null;
    }

    // SW가 등록된 이후에 getToken 호출 (ready 사용)
    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    return token ?? null;
  } catch (err) {
    console.warn('FCM 토큰 발급 실패:', err);
    return null;
  }
}

export async function deleteFcmToken(): Promise<void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  try {
    await deleteToken(messaging);
  } catch (e) {
    console.warn('FCM 토큰 삭제 실패:', e);
  }
}


