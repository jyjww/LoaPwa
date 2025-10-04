// src/components/Header.tsx
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoLight from '@/assets/icon.svg';
import logoDark from '@/assets/icon_dark.svg';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePushInbox } from '@/hooks/usePushInbox';
import ToggleIOS from '@/components/ui/toggleIOS';
import { usePushToggle } from '@/hooks/usePushToggle';

type ThemePref = 'light' | 'dark' | 'system';

const Header = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);

  // 알림 인박스(뱃지/목록)
  const { unread, items, resetUnread } = usePushInbox();

  // 푸시 ON/OFF 훅(권한/에러/로딩 포함)
  const { enabled, permission, loading, error, enable, disable } = usePushToggle();

  // ======== Theme (light | dark | system) ========
  const [theme, setTheme] = useState<ThemePref>(() => {
    return (localStorage.getItem('theme') as ThemePref) || 'system';
  });

  // 현재 적용중인 실제 테마(light/dark)
  const effectiveTheme = useMemo<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // 문서에 클래스 적용
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [effectiveTheme]);

  // system 선택 시, OS 변경 이벤트 반영
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const root = document.documentElement;
      if (mq.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [theme]);

  const cycleTheme = (e?: React.MouseEvent) => {
    // Alt/Option 클릭 시 system으로 빠르게 전환
    if (e?.altKey) {
      localStorage.setItem('theme', 'system');
      setTheme('system');
      return;
    }
    const next: ThemePref = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  // 로그인 여부
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
  }, []);

  // 벨 클릭 → 모달 열고 미확인 수 리셋
  const handleBellClick = async () => {
    setOpen(true);
    resetUnread();
  };

  // 토글 변경
  const onToggleChange = async (next: boolean) => {
    try {
      if (!isLoggedIn) return alert('로그인이 필요합니다.');
      if (next) await enable();
      else await disable();
    } catch (e) {
      if (permission === 'denied') {
        alert(
          '알림 권한이 차단되어 있어요.\n브라우저/OS 설정에서 이 사이트의 알림을 허용해 주세요.\n(iOS: 설정 > 알림 > 앱 이름)',
        );
      } else {
        alert('알림 설정 중 오류가 발생했습니다.');
      }
    }
  };

  // 로그인/로그아웃 버튼
  const handleLoginClick = async () => {
    if (isLoggedIn) {
      const ok = window.confirm('로그아웃 하시겠습니까?');
      if (!ok) return;
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (err) {
        console.error('로그아웃 요청 실패:', err);
      }
      localStorage.removeItem('access_token');
      setIsLoggedIn(false);
      navigate('/');
      alert('로그아웃 되었습니다.');
    } else {
      navigate('/login');
    }
  };

  const themeTitle =
    theme === 'system'
      ? '테마: 시스템 (Alt-클릭으로 바로 전환)'
      : `테마: ${theme === 'dark' ? '다크' : '라이트'} (Alt-클릭: 시스템)`;

  return (
    <header className="w-full bg-background">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3 sm:p-4">
        {/* 좌측 로고 */}
        <Link to="/" className="font-bold text-2xl text-primary">
          <img
            src={effectiveTheme === 'dark' ? logoDark : logoLight}
            alt="로아 알리미 로고"
            width={40}
            height={40}
          />
        </Link>

        {/* 우측: 테마 토글 + 벨 + 로그인 */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 🌓 다크모드 토글 */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={cycleTheme}
            onContextMenu={(e) => {
              e.preventDefault();
              localStorage.setItem('theme', 'system');
              setTheme('system');
            }}
            title={themeTitle}
          >
            {effectiveTheme === 'dark' ? (
              <Moon className="!h-5 !w-5" />
            ) : (
              <Sun className="!h-5 !w-5" />
            )}
          </Button>

          {/* 🔔 알림 벨: 모달 열기 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            onClick={handleBellClick}
            title={
              permission === 'granted'
                ? '푸시 알림 허용됨'
                : permission === 'denied'
                  ? '알림 차단됨(브라우저/OS 설정에서 변경)'
                  : '알림 권한 요청 필요'
            }
          >
            <Bell className="!h-6 !w-6" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Button>

          {/* 👤 로그인 */}
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLoginClick}>
            <User className="!h-6 !w-6" />
          </Button>
        </div>
      </div>

      {/* 알림 모달 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle>알림</DialogTitle>
          </DialogHeader>

          {/* 토글 블록 */}
          <div className="px-5 pb-3 space-y-2">
            <ToggleIOS
              checked={enabled}
              onChange={onToggleChange}
              disabled={loading}
              label="알림 허용"
            />
            <p className="text-xs text-muted-foreground">
              권한: <b>{permission}</b>
              {permission === 'denied' && ' — 브라우저/OS 설정에서 허용해야 합니다.'}
              {!isLoggedIn && ' — 로그인 후 이용 가능합니다.'}
            </p>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* 인박스 리스트 */}
          <div className="px-5 pb-5 max-h-80 overflow-auto space-y-3">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">새 알림이 없습니다.</div>
            ) : (
              items.map((m, i) => (
                <button
                  key={i}
                  onClick={() => (window.location.href = m.url || '/')}
                  className="w-full text-left p-3 rounded-lg border mobile-card hover:bg-muted/50"
                >
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.body}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(m.ts).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
