[![Bolt.new: AI-Powered Full-Stack Web Development in the Browser](./public/social_preview_index.jpg)](https://bolt.new)

# Gobeze AI: AI-Powered Full-Stack Web Development

Gobeze AI is an AI-powered web development tool that allows you to prompt, run, edit, and deploy full-stack applications directly from your browser—no local setup required.

## What Makes Gobeze AI Different

Our platform stands out with these key features:

- **Full-Stack in the Browser**: Gobeze AI provides a complete in-browser development environment powered by modern web technologies. This allows you to:
  - Install and manage npm packages
  - Run Node.js servers
  - Edit code in real-time
  - Deploy applications
  - Debug with full console access

- **AI with Environment Control**: Unlike traditional dev environments where the AI can only assist in code generation, Gobeze AI gives AI models **complete control** over the entire environment including the filesystem, node server, package manager, terminal, and browser console. This empowers AI agents to handle the entire development workflow.

Whether you're an experienced developer, a PM or designer, Gobeze AI allows you to build production-grade full-stack applications with ease.

## Getting Started

Here are some tips to get the most out of Gobeze AI:

1. **Be Specific**: When describing what you want to build, be as specific as possible. Include details about:
   - Desired functionality
   - UI/UX preferences
   - Technical requirements
   - Performance expectations

2. **Iterative Development**: Break down complex features into smaller tasks and work iteratively.

3. **Review & Refine**: Always review the AI's output and provide feedback to refine the results.

## Deployment

The application is deployed to Google Cloud Platform. Make sure you have the necessary GCP credentials and permissions set up before deploying.

## FAQs

**Is this a beta?**
Yes, Gobeze AI is in beta, and we are actively improving it based on feedback.

**How can I report issues?**
Check out the [Issues section](https://github.com/yourusername/gobeze-ai/issues) to report an issue or request a new feature. Please use the search feature to check if someone else has already submitted the same issue/request.

**What frameworks are supported?**
Gobeze AI supports most popular JavaScript frameworks and libraries out of the box.

# AT Protocol Code Assistant

A code assistant service built on the AT Protocol.

## Pre-Deployment Checklist

1. Environment Variables
   - [ ] Set `REDIS_URL` for Redis connection
   - [ ] Set `GCP_PROJECT_ID` for Google Cloud Platform
   - [ ] Set `AT_PROTOCOL_HEALTH_USER` and `AT_PROTOCOL_HEALTH_PASS` for health checks
   - [ ] Set `NODE_ENV=production` for production environment

2. Infrastructure
   - [ ] Set up Redis instance in GCP
   - [ ] Configure VPC connector for Redis access
   - [ ] Set up Cloud Monitoring
   - [ ] Set up Error Reporting
   - [ ] Configure SSL certificates

3. Security
   - [ ] Review API rate limits
   - [ ] Check session timeout settings
   - [ ] Verify error handling doesn't expose sensitive info
   - [ ] Enable Cloud Security Scanner

4. Monitoring
   - [ ] Set up alerts for error rates
   - [ ] Configure uptime monitoring
   - [ ] Set up performance monitoring
   - [ ] Configure log-based metrics

5. Deployment Steps
   ```bash
   # 1. Run pre-deployment checks
   npm run pre-deploy

   # 2. Build the application
   npm run build

   # 3. Deploy to GCP
   gcloud app deploy deploy/gcp/app.yaml

   # 4. Verify deployment
   gcloud app browse
   ```

6. Post-Deployment
   - [ ] Verify health check endpoint
   - [ ] Test AT Protocol connectivity
   - [ ] Monitor error rates
   - [ ] Check performance metrics

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build
```

## Architecture

The service is built on:
- AT Protocol for decentralized social networking
- Redis for caching and session management
- Google Cloud Platform for hosting and infrastructure
- Monitoring and error reporting through GCP services

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## Monitoring

The service includes:
- Request rate monitoring
- Error tracking
- Performance metrics
- Session analytics
- Cache hit rates

## Error Handling

The service implements:
- Custom error types for AT Protocol
- Retry mechanism with exponential backoff
- Rate limiting
- Graceful degradation
- Comprehensive error reporting

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests and linting
4. Submit a pull request

## License

[Add your license information here]
