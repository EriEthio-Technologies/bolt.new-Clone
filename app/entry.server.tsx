import { type EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { renderToString } from 'react-dom/server';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import express from 'express';
import { Response } from '@remix-run/node';
import { metricsMiddleware } from './middleware/metrics';
import { loggingMiddleware } from './middleware/logging.server';
import { ResourceMetricsCollector } from './services/ResourceMetricsCollector';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const instance = express();
  
  // Apply middlewares
  instance.use(corsMiddleware);
  instance.use(rateLimitMiddleware);
  
  // Initialize resource metrics collection
  ResourceMetricsCollector.getInstance().start();
  
  // Add monitoring middleware
  instance.use(loggingMiddleware());
  instance.use(metricsMiddleware);
  
  // Apply routes
  instance.use(remixContext.routeModules);
  
  // Error handling
  instance.use(errorHandler);
  
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set('Content-Type', 'text/html');

  return new Response('<!DOCTYPE html>' + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
