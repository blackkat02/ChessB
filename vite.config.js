/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: false,
  },
  test: {
    // Глобальні API (describe/it/expect) без імпортів
    globals: true,
    // jsdom потрібен для майбутніх тестів React-компонентів
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.{test,spec}.{js,jsx}', 'src/test/**', 'src/main.jsx'],
    },
  },
});
