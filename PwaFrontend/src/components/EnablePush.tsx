export default function EnablePush() {
  const request = async () => {
    if (!('Notification' in window)) return alert('이 브라우저는 알림을 지원하지 않아요.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      alert(`알림 권한: ${perm}`);
      return;
    }

    try {
      const { issueFcmTokenWithVapid } = await import('@/lib/firebase');
      const token = await issueFcmTokenWithVapid();
      if (!token) {
        alert('FCM 토큰 발급 실패');
        return;
      }

      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        alert('로그인이 필요합니다.');
        return;
      }

      const { jwtDecode } = await import('jwt-decode');
      const payload: any = jwtDecode(accessToken);
      const userId = payload?.sub || payload?.id;
      if (!userId) {
        alert('사용자 식별 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      const axios = (await import('@/services/axiosInstance')).default;
      await axios.post('/fcm/register', { userId, token });
      alert('푸시 알림이 활성화되었습니다.');
    } catch (e) {
      console.error(e);
      alert('푸시 활성화 중 오류가 발생했습니다. 콘솔을 확인하세요.');
    }
  };
  return (
    <button onClick={request} style={{ padding: '8px 12px', borderRadius: 8 }}>
      알림 활성화
    </button>
  );
}
