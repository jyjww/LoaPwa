// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  // 👉 강제로 HMR을 켜고 싶으면 VITE_FORCE_HMR=true 를 넣어줘
  const enableHMR = isDev || env.VITE_FORCE_HMR === 'true';

  // 브라우저에서 접근 가능한 호스트/포트로 설정(중요!)
  // 컨테이너 내부 주소가 아니라 "브라우저 입장에서 보이는" 호스트를 써야 함.
  const HMR_CLIENT_HOST = env.VITE_HMR_CLIENT_HOST || 'localhost';
  const HMR_CLIENT_PORT = Number(env.VITE_HMR_CLIENT_PORT || 5173);

  const ALLOWED = (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, 'shared'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: { include: ['react', 'react-dom'] },

    // ✅ dev 서버를 쓸 때만 server/HMR 설정을 얹는다
    server: enableHMR
      ? {
          host: '0.0.0.0', // 컨테이너 바인딩
          port: 5173,
          historyApiFallback: true,
          hmr: {
            // 👉 "브라우저가 접속할" 호스트/포트
            host: HMR_CLIENT_HOST, // 예: localhost
            port: HMR_CLIENT_PORT, // 예: 5173
            clientPort: HMR_CLIENT_PORT,
            protocol: 'ws',
          },
          proxy: {
            '/api': {
              target: 'http://loa-server:4000',
              changeOrigin: true,
              // /api 프리픽스 제거해서 백엔드에 /auth/... 로 전달
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          },
          allowedHosts: ALLOWED,
        }
      : undefined,
  };
});
