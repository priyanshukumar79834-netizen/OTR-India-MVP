import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This app deliberately has NO proxy to OTR's backend, unlike OTR's own
// frontend. It's a genuinely separate website: it calls OTR's public,
// CORS-enabled endpoints directly, cross-origin, exactly like a real
// external government portal would. See src/api/otr.ts.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  preview: {
    port: 5174,
  },
});
