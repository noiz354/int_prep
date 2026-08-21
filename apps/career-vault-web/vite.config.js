import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5191,
    strictPort: true,
    allowedHosts: true,
    fs: { allow: [repoRoot] },
    proxy: {
      '/v1': { target: 'http://127.0.0.1:8792', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4191,
  },
});
