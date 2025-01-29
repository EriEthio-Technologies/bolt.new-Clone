import { createRequestHandler } from "@remix-run/node";
import express from "express";
import apiLimiter from "./app/middleware/RateLimit";
import { setupMonitoring } from "./app/monitoring-setup.server";
import securityMiddleware from "./app/middleware/security";
import * as build from "@remix-run/dev/server-build";

const app = express();

// Apply security middleware first
app.use(securityMiddleware);

// Apply rate limiting to all routes
app.use(apiLimiter);

// Set up monitoring and alerts
app.use(...setupMonitoring());

// Create request handler for Remix
const handler = createRequestHandler(build, process.env.NODE_ENV);

// Handle all routes with Remix
app.all('*', handler);

// Error handling middleware should be last
import { errorHandler } from './app/utils/errorHandler';
app.use(errorHandler);

export default app; 