import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const vite = await createServer({
    root: __dirname,
    server: {
      port: 3000,
      hmr: true,
    },
    optimizeDeps: {
      include: ['@remix-run/react', '@remix-run/node'],
    },
  });

  await vite.listen();
  console.log('Development server running at http://localhost:3000');
}

startServer().catch((error) => {
  console.error('Failed to start development server:', error);
  process.exit(1);
}); 