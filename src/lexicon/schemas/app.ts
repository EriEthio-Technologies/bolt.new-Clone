export const AppBskyCodeAssistant = {
    lexicon: 1,
    id: 'app.bsky.code.assistant',
    defs: {
        codeRequest: {
            type: 'record',
            key: 'codeRequest',
            record: {
                type: 'object',
                required: ['prompt', 'language', 'timestamp'],
                properties: {
                    prompt: { type: 'string', maxLength: 5000 },
                    context: { type: 'string', maxLength: 10000 },
                    language: { type: 'string', maxLength: 50 },
                    timestamp: { type: 'string', format: 'datetime' },
                    tags: { 
                        type: 'array', 
                        items: { type: 'string' },
                        maxLength: 5
                    },
                    visibility: {
                        type: 'string',
                        enum: ['public', 'private', 'unlisted']
                    },
                    threadParent: { type: 'string', format: 'uri' },
                    threadRoot: { type: 'string', format: 'uri' }
                }
            }
        },
        codeResponse: {
            type: 'record',
            key: 'codeResponse',
            record: {
                type: 'object',
                required: ['requestUri', 'code', 'timestamp'],
                properties: {
                    requestUri: { type: 'string', format: 'uri' },
                    code: { type: 'string', maxLength: 50000 },
                    language: { type: 'string', maxLength: 50 },
                    explanation: { type: 'string', maxLength: 5000 },
                    timestamp: { type: 'string', format: 'datetime' },
                    metrics: {
                        type: 'object',
                        properties: {
                            executionTime: { type: 'number' },
                            memoryUsage: { type: 'number' },
                            complexity: { type: 'number' }
                        }
                    }
                }
            }
        }
    }
} 