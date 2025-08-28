export default function EnablePush() {
  const request = async () => {
    if (!('Notification' in window)) return alert('이 브라우저는 알림을 지원하지 않아요.');
    const perm = await Notification.requestPermission();
    alert(`알림 권한: ${perm}`); // 'granted'면 OK
  };
  return (
    <button onClick={request} style={{ padding: '8px 12px', borderRadius: 8 }}>
      알림 활성화
    </button>
  );
}
