export const securityMiddleware = [
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  }),
  helmet(),
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true
  })
]; 