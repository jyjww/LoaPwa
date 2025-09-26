import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import { useEffect, useState } from 'react';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token); // 토큰 있으면 로그인 상태
  }, []);

  const handleLoginClick = async () => {
    if (isLoggedIn) {
      const confirmLogout = window.confirm('로그아웃 하시겠습니까?');
      if (confirmLogout) {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include', // ✅ refresh_token 쿠키 보내기 필수
          });
        } catch (err) {
          console.error('로그아웃 요청 실패:', err);
        }

        localStorage.removeItem('access_token');
        setIsLoggedIn(false);
        navigate('/');
        alert('로그아웃 되었습니다.');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="w-full bg-background">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3 sm:p-4">
        {/* 좌측 로고 */}
        <Link to="/" className="font-bold text-2xl text-primary">
          <img src={logo} alt="로아 알리미 로고" width={40} height={40} />
        </Link>

        {/* 우측 로그인 아이콘 */}
        <Link to="/login">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLoginClick}>
            <User className="!h-6 !w-6" />
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default Header;
