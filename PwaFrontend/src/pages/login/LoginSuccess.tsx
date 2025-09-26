import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginSuccess = () => {
  console.log('✅ LoginSuccess 컴포넌트 렌더링됨');
  const navigate = useNavigate();
  const { search } = useLocation();
  const ran = useRef(false); // 🔒 StrictMode 2회 실행 가드 (개발용)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    console.log('🎫 effect 실행');
    const params = new URLSearchParams(search);
    console.log('params:', params.toString());

    const tokenFromUrl = params.get('accessToken');
    const tokenInStorage = localStorage.getItem('access_token');
    console.log('🎫 accessToken from URL:', tokenFromUrl);

    if (tokenFromUrl) {
      // 1) 토큰 저장
      localStorage.setItem('access_token', tokenFromUrl);
      // 2) 주소창에서 쿼리스트링 제거 (뒤로가기 이슈도 방지)
      window.history.replaceState({}, '', '/');

      // 3) 완전 새로고침으로 트리 초기화(StrictMode 더블 이펙트 회피)
      window.location.replace('/');
      return;
    }

    // 토큰이 URL엔 없지만 스토리지엔 있으면 홈으로
    if (tokenInStorage) {
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, search]);

  return <p>로그인 처리 중입니다...</p>;
};

export default LoginSuccess;
