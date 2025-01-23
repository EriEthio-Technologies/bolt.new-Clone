import { createRequestHandler } from '@remix-run/vercel';
import * as build from '../build/server';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext: (context) => context,
});

export default handler;