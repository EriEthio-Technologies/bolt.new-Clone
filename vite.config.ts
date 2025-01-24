import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    nodePolyfills({
      include: ['buffer', 'stream', 'events', 'path', 'util', 'process']
    })
  ],
  build: {
    target: 'esnext',
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './app/entry.client.tsx'
      }
    }
  },
  server: {
    port: 3000
  }
});
