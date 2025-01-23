import { createRequestHandler } from '@remix-run/vercel';
import * as build from '../build/server';

export const config = {
  runtime: 'edge',
};

export default createRequestHandler({ build });
