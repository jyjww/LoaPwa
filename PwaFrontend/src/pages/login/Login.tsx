// src/pages/Login.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { LogIn } from 'lucide-react';

const Login = () => {
  const handleGoogleLogin = () => {
    // ✅ 서버의 구글 OAuth 로그인 엔드포인트로 리다이렉트
    // window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
    const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
    window.location.href = `${base}/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-2 border-primary/40 bg-primary/5 shadow-md">
        {/* 헤더 */}
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <LogIn className="h-4 w-4 text-primary" />
            SNS Login
          </CardTitle>
        </CardHeader>

        {/* 콘텐츠 */}
        <CardContent className="space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            구글 계정으로 간편하게 로그인하세요.
          </p>

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
          >
            <FcGoogle className="h-5 w-5" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
