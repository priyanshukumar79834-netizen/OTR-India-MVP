import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Lets the frontend call `/api/...` directly in dev without CORS
      // headaches; Adi's real API client should still go through a small
      // fetch wrapper rather than hardcoding this assumption everywhere.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
