import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev` (port 5173), proxy /api/* to netlify functions running on 8888.
// In production on Netlify, the redirect in netlify.toml handles it.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8888',
    },
  },
});
