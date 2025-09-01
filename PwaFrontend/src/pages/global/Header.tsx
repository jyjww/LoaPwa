import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoLoaPwa from '@/assets/logoLoaPwa.png';
import { useEffect, useState } from 'react';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token); // 토큰 있으면 로그인 상태
  }, []);

  const handleLoginClick = () => {
    if (isLoggedIn) {
      const confirmLogout = window.confirm('로그아웃 하시겠습니까?');
      if (confirmLogout) {
        localStorage.removeItem('access_token');
        setTimeout(() => navigate('/'), 0);
        alert('로그아웃 되었습니다.');
      }
    } else {
      navigate('/login'); // ✅ 로그인 안돼있으면 로그인 페이지
    }
  };

  return (
    <header className="w-full bg-background">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3 sm:p-4">
        {/* 좌측 로고 */}
        <Link to="/" className="font-bold text-lg text-primary">
          <img src={logoLoaPwa} alt="로아 알리미 로고" width={40} height={40} />
        </Link>

        {/* 우측 로그인 아이콘 */}
        <Link to="/login">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLoginClick}>
            <User className="text-muted-foreground" />
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default Header;
