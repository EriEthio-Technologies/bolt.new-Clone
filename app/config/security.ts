export const securityConfig = {
  // HTTPS configuration
  https: {
    enabled: true,
    forceRedirect: process.env.NODE_ENV === 'production',
  },
  
  // CORS configuration
  cors: {
    enabled: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  },
  // Add other security configurations here as needed
};

export default securityConfig;