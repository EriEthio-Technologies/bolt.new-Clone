[![GobezeAI Open Source Codebase](./public/social_preview_index.jpg)](https://gobezeai.new)

# Gobeze AI

> Welcome to the **Gobeze AI** codebase! This repo contains an AI-powered software development tool built with the AT Protocol and modern web technologies.

### Features

This project allows you to create browser-based applications that let users **prompt, run, edit, and deploy** full-stack web apps directly in the browser. The application gives AI direct access and full control over a **Node.js server**, **filesystem**, **package manager** and **dev terminal** inside your users browser tab. This powerful combination allows you to create development tools that support all major JavaScript libraries and Node packages right out of the box.

# Get Started Building with Gobeze AI

Gobeze AI combines the capabilities of AI with sandboxed development environments to create a collaborative experience where code can be developed by the assistant and the programmer together. It uses [Claude Sonnet 3.5](https://www.anthropic.com/news/claude-3-5-sonnet) with [Remix](https://remix.run/) and the AT Protocol.

### Remix App

The application is built with [Remix](https://remix.run/) and deployed using [Google Cloud Platform](https://cloud.google.com/) with App Engine and Cloud Run services.

### AT Protocol Integration

Gobeze AI uses the AT Protocol for decentralized social networking features. You can get started with AT Protocol by visiting [bsky.app](https://bsky.app/) and creating an account.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v20.15.1)
- pnpm (v9.4.0)

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/gobeze-ai.git
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file in the root directory and add your environment variables:

```
AT_PROTOCOL_KEY=XXX
```

Optionally, you can set the debug level:

```
VITE_LOG_LEVEL=debug
```

**Important**: Never commit your `.env.local` file to version control. It's already included in .gitignore.

## Available Scripts

- `pnpm run dev`: Starts the development server.
- `pnpm run build`: Builds the project.
- `pnpm run start`: Runs the built application locally.
- `pnpm run preview`: Builds the project and then starts it locally, useful for testing the production build.
- `pnpm test`: Runs the test suite using Vitest.
- `pnpm run typecheck`: Runs TypeScript type checking.

## Development

To start the development server:

```bash
pnpm run dev
```

This will start the Remix Vite development server.

## Testing

Run the test suite with:

```bash
pnpm test
```

## Deployment

The application is deployed to Google Cloud Platform. Make sure you have the necessary GCP credentials and permissions set up before deploying.

# Contributing to Gobeze AI

Thank you for your interest in contributing to Gobeze AI! This document provides guidelines and instructions for contributing to our project.

## Development Environment Setup

### Prerequisites

- Node.js (v20.15.1 or higher)
- pnpm (v9.4.0 or higher)
- Git
- Google Cloud SDK
- AT Protocol Developer Account

### Initial Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gobeze-ai.git
   cd gobeze-ai
   ```

2. Run our automated setup script:
   ```bash
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

## Development Workflow

### Branch Naming Convention

- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`
- Performance: `perf/description`

### Coding Standards

- Use TypeScript for all new code
- Follow [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- Maintain 90% or higher test coverage
- Use ESLint and Prettier configurations provided

### Debugging

Use our DebugService for consistent logging:

```typescript
import { Container } from 'typedi';
import { DebugService } from '~/lib/services/debug/DebugService';

const debug = Container.get(DebugService);

// Log levels: error, warn, info, debug
debug.log('info', 'ComponentName', 'Action performed', { 
  optional: 'metadata'
});
```

### Testing

1. Unit Tests:
   ```bash
   pnpm test:unit
   ```

2. Integration Tests:
   ```bash
   pnpm test:integration
   ```

3. E2E Tests:
   ```bash
   pnpm test:e2e
   ```

### Performance Monitoring

Monitor your changes using our built-in tools:

1. Development Dashboard:
   ```bash
   pnpm run dev:dashboard
   ```

2. Performance Metrics:
   ```bash
   pnpm run analyze
   ```

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes following our guidelines

3. Run the verification suite:
   ```bash
   pnpm run verify
   ```

4. Update documentation:
   - Add JSDoc comments
   - Update README if needed
   - Add to CHANGELOG.md

5. Submit PR with:
   - Clear description
   - Issue references
   - Screenshots/videos if relevant
   - Test coverage report

### PR Review Checklist

- [ ] Follows coding standards
- [ ] Includes tests
- [ ] Updates documentation
- [ ] Passes CI/CD pipeline
- [ ] No security vulnerabilities
- [ ] Performance impact assessed
- [ ] AT Protocol compatibility maintained

## AT Protocol Integration

When working with AT Protocol features:

1. Test with development PDS:
   ```bash
   pnpm run dev:pds
   ```

2. Verify protocol compliance:
   ```bash
   pnpm run verify:at-protocol
   ```

3. Follow AT Protocol best practices:
   - Handle rate limits appropriately
   - Implement proper error handling
   - Use protocol versioning correctly

## Monitoring and Debugging

### Development Monitoring

Access development metrics at:
- Local: http://localhost:3001/debug
- Staging: https://staging.gobeze.ai/debug

### Log Levels

Configure debug levels in `.env.local`:
```
DEBUG_LEVEL=debug|info|warn|error
```

### Performance Monitoring

Monitor your changes:
```bash
pnpm run dev:monitor
```

## Release Process

1. Version Bump:
   ```bash
   pnpm run version
   ```

2. Update CHANGELOG.md
3. Create release PR
4. After approval:
   ```bash
   pnpm run release
   ```

## Getting Help

- Join our [Discord](https://discord.gg/gobeze-ai)
- Check [Documentation](https://docs.gobeze.ai)
- Tag maintainers in issues/PRs
- Weekly developer office hours

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
