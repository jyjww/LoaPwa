import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 좌측: 로고/브랜드 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© 2025 LostArk PWA</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">로알림</span>
          </div>

          {/* 우측: 링크들 */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Link
              to="/privacy"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Shield className="h-3 w-3" />
              개인정보처리방침
            </Link>
            <span className="text-border">•</span>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdQNcI3QAMaZjjo3x7L_UQQ7BYAbh_hlLp9JiUsd1z2XSk10Q/viewform?usp=sharing&ouid=101610239185867176385">
              문의하기
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
