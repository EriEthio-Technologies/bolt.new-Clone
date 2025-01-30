import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  build: {
    target: 'esnext',
    manifest: true,
    rollupOptions: {
      input: {
        main: './app/entry.client.tsx',
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    include: [
      '@remix-run/react',
      '@remix-run/node',
      'react',
      'react-dom',
    ],
  },
});
