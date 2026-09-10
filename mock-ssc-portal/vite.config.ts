import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This app deliberately has NO proxy to OTR's backend, unlike OTR's own
// frontend. It's a genuinely separate website: it calls OTR's public,
// CORS-enabled endpoints directly, cross-origin, exactly like a real
// external government portal would. See src/api/otr.ts.
//
// Phase 3: the ONE exception is `/api/ssc/...`, which proxies to THIS
// app's own tiny backend (mock-ssc-portal/server/) rather than OTR's —
// same-origin in dev via this proxy, same pattern OTR's own
// frontend/vite.config.ts already uses for its `/api` -> backend proxy.
// That server holds the SSC client secret; it must never be reachable
// from the browser directly, only called from this app's own JS same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/ssc': {
        target: 'http://localhost:4174',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5174,
    proxy: {
      '/api/ssc': {
        target: 'http://localhost:4174',
        changeOrigin: true,
      },
    },
  },
});
