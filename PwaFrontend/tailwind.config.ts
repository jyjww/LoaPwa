import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}', // 있는 경우
    './shared/**/*.{ts,tsx,js,jsx}', // 👈 모노레포 공유 코드
    '../shared/**/*.{ts,tsx,js,jsx}', // 👈 빌드 컨텍스트에 따라 상대경로도 포함
  ],
  darkMode: 'class', // Tailwind v4는 string도 지원됨
  plugins: [animate],
} satisfies Config;
