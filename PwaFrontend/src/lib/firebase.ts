// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, isSupported } from 'firebase/messaging';
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
