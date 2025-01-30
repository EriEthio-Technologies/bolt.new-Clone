import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

installGlobals();

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = join(__dirname, 'build');

const app = express();

app.use(compression());
app.use(morgan('tiny'));

// Handle asset requests
app.use(express.static('public', { maxAge: '1h' }));

// Handle data requests
app.all(
  '*',
  createRequestHandler({
    build: await import('./build/index.js'),
    mode: 'development',
  }),
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Development server running at http://localhost:${port}`);
}); 