import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5192,
    strictPort: true,
    allowedHosts: true,
    fs: { allow: [resolve('../..')] },
    proxy: {
      '/socket.io': { target: 'http://127.0.0.1:8787', changeOrigin: true, ws: true },
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
});
