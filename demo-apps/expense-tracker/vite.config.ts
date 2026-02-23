import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  server: {
    port: 5200,
    proxy: {
      '/api': 'http://localhost:5201',
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
