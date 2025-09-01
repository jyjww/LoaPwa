import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      // ✅ 로컬 스토리지에 저장
      localStorage.setItem('access_token', token);

      // 메인 페이지로 이동
      setTimeout(() => navigate('/'), 0);
    } else {
      // 토큰 없으면 로그인 페이지로 이동
      navigate('/login');
    }
  }, [navigate]);

  return <p>로그인 처리 중입니다...</p>;
};

export default LoginSuccess;
