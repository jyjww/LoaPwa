import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const HMR_HOST = env.VITE_HMR_HOST || 'localhost';
  const HMR_PORT = Number(env.VITE_HMR_PORT || 5173);

  // 쉼표로 받은 호스트 리스트 (개발용)
  const ALLOWED = (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

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
      allowedHosts: ALLOWED,
    },
  };
});
