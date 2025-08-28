import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // Tailwind v4는 string도 지원됨
  plugins: [animate],
} satisfies Config;
