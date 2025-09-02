import path from 'path';
import { defineConfig } from 'vite';

// Legacy Vite config for old monolith build.
// Security: Do NOT inject any API keys into the frontend bundle.
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
