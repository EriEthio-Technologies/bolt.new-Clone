[![Bolt Open Source Codebase](./public/social_preview_index.jpg)](https://bolt.new)

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
