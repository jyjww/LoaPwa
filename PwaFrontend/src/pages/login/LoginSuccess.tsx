import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginSuccess = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const ran = useRef(false); // 🔒 StrictMode 2회 실행 가드 (개발용)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(search);
    const tokenFromUrl = params.get('accessToken');
    const tokenInStorage = localStorage.getItem('access_token');

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
