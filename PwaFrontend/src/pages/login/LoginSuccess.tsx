import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginSuccess = () => {
  console.log('✅ LoginSuccess 컴포넌트 렌더링됨');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🎫 effect 실행');
    const params = new URLSearchParams(window.location.search);
    console.log('params:', params.toString());
    const token = params.get('accessToken');

    console.log('🎫 accessToken from URL:', token);

    if (token) {
      // ✅ 로컬 스토리지에 저장
      localStorage.setItem('access_token', token);

      navigate('/', { replace: true });
      alert('로그인 성공');
    } else {
      // 토큰 없으면 로그인 페이지로 이동
      navigate('/login');
    }
  }, [navigate]);

  return <p>로그인 처리 중입니다...</p>;
};

export default LoginSuccess;
