interface Config {
    atProtocol: {
        service: string
        rateLimit: {
            tokensPerInterval: number
            interval: string
        }
    }
    redis: {
        url: string
    }
    gcp: {
        projectId: string
        monitoring: {
            namespace: string
        }
        errorReporting: {
            service: string
            version: string
        }
    }
}

const config: Config = {
    atProtocol: {
        service: 'https://bsky.social',
        rateLimit: {
            tokensPerInterval: 100,
            interval: '1m'
        }
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    gcp: {
        projectId: process.env.GCP_PROJECT_ID || 'default-project',
        monitoring: {
            namespace: 'atprotocol'
        },
        errorReporting: {
            service: 'atprotocol-client',
            version: process.env.APP_VERSION || '1.0.0'
        }
    }
}

export default config 