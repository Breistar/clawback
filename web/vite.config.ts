import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig(({ mode }) => {
  // Must match server/.env API_PORT — use 127.0.0.1 so we never hit clawback-prototype on :3001
  const env = loadEnv(mode, repoRoot, '');
  const apiPort = env.API_PORT || '3002';
  const apiTarget = `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  };
});
