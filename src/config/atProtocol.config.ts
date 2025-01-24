export const ATProtocolConfig = {
    service: {
        production: 'https://bsky.social',
        development: 'http://localhost:2583',
    },
    collections: {
        codeRequest: 'app.bsky.code.assistant.codeRequest',
    },
    timeouts: {
        connection: 5000,
        request: 10000,
    },
    retries: {
        maxAttempts: 3,
        backoffMs: 1000,
    }
} 