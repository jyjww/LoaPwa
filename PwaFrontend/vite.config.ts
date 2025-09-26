import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // .env만 있어도 OK. 세 번째 인자 '' → 접두사 제한 없이 모두 로드
  const env = loadEnv(mode, process.cwd(), '');

  const HMR_HOST = env.VITE_HMR_HOST || '0.0.0.0';
  const HMR_PORT = Number(env.VITE_HMR_PORT || 5173);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: { include: ['react', 'react-dom'] },
    server: {
      host: '0.0.0.0',
      port: 5173,
      historyApiFallback: true,
      hmr: {
        host: HMR_HOST,
        port: HMR_PORT,
        protocol: 'ws',
        clientPort: HMR_PORT,
      },
      // allowedHosts: [env.VITE_ALLOWED_HOSTS, 'localhost'],
      allowedHosts: ['localhost', '127.0.0.1', 'db3c7fd4cc7d.ngrok-free.app'],
    },
  };
});
