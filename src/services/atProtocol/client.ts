import { BskyAgent, AtpSessionEvent, AtpSessionData, RichText } from '@atproto/api'
import { AppBskyCodeAssistant } from '../../lexicon/schemas/app'
import { Redis } from 'ioredis'
import { RateLimiter } from 'limiter'
import { Monitoring } from '../../monitoring'
import { retry } from '../../utils/retry'
import { ErrorReporting } from '../../monitoring/error'

export class ATProtocolClientError extends Error {
    constructor(message: string, public readonly code: string, public readonly originalError?: Error) {
        super(message)
        this.name = 'ATProtocolClientError'
    }
}

export class ATProtocolClient {
    private agent: BskyAgent
    private sessionData: AtpSessionData | null = null
    private cache: Redis
    private rateLimiter: RateLimiter
    private monitoring: Monitoring
    private errorReporting: ErrorReporting
    
    constructor(config: {
        redisUrl: string,
        rateLimit: { tokensPerInterval: number, interval: string },
        monitoring: Monitoring,
        errorReporting: ErrorReporting
    }) {
        this.agent = new BskyAgent({
            service: 'https://bsky.social',
            persistSession: this.handleSessionPersistence.bind(this),
        })
        
        this.cache = new Redis(config.redisUrl)
        this.rateLimiter = new RateLimiter(config.rateLimit)
        this.monitoring = config.monitoring
        this.errorReporting = config.errorReporting
        
        // Initialize monitoring
        this.setupMonitoring()
    }

    private handleSessionPersistence(evt: AtpSessionEvent, sess?: AtpSessionData) {
        this.sessionData = sess || null
        if (sess) {
            this.cache.set(`session:${sess.did}`, JSON.stringify(sess), 'EX', 3600) // Cache for 1 hour
        }
    }

    private setupMonitoring() {
        this.monitoring.gauge('atprotocol_active_sessions', () => this.sessionData ? 1 : 0)
        this.monitoring.counter('atprotocol_requests_total')
        this.monitoring.histogram('atprotocol_request_duration_ms')
    }

    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        context: string
    ): Promise<T> {
        const startTime = Date.now()
        
        try {
            await this.rateLimiter.removeTokens(1)
            
            const result = await retry(
                async () => {
                    try {
                        return await operation()
                    } catch (error) {
                        // Ensure operation errors are properly propagated
                        if (error instanceof ATProtocolClientError) {
                            throw error
                        }
                        throw new ATProtocolClientError(
                            `Operation failed: ${context}`,
                            'OPERATION_FAILED',
                            error instanceof Error ? error : undefined
                        )
                    }
                },
                {
                    retries: 3,
                    factor: 2,
                    minTimeout: 1000,
                    maxTimeout: 5000,
                }
            )
            
            this.monitoring.histogram('atprotocol_request_duration_ms').observe(Date.now() - startTime)
            this.monitoring.counter('atprotocol_requests_total').inc({ status: 'success', context })
            
            return result
        } catch (error) {
            this.monitoring.counter('atprotocol_requests_total').inc({ status: 'error', context })
            this.errorReporting.captureError(error, { context })
            throw error // Propagate the error directly
        }
    }

    async connect(identifier: string, password: string): Promise<boolean> {
        return this.executeWithRetry(
            async () => {
                try {
                    await this.agent.login({
                        identifier,
                        password,
                    })
                    return true
                } catch (error) {
                    this.errorReporting.captureError(error, { context: 'connect' })
                    throw new ATProtocolClientError(
                        'Failed to connect to AT Protocol',
                        'CONNECTION_FAILED',
                        error instanceof Error ? error : undefined
                    )
                }
            },
            'connect'
        )
    }

    async createSession(): Promise<AtpSessionData | null> {
        return this.executeWithRetry(
            async () => {
                if (!this.sessionData) {
                    throw new ATProtocolClientError('No active session', 'NO_SESSION')
                }
                
                const cachedSession = await this.cache.get(`session:${this.sessionData.did}`)
                if (cachedSession) {
                    const session = JSON.parse(cachedSession)
                    await this.agent.resumeSession(session)
                    return session
                }
                
                await this.agent.resumeSession(this.sessionData)
                return this.sessionData
            },
            'createSession'
        )
    }

    async submitCodeRequest(prompt: string, context: string, language: string): Promise<string> {
        return this.executeWithRetry(
            async () => {
                if (!this.agent.session?.did) {
                    throw new ATProtocolClientError('No active session', 'NO_SESSION')
                }

                const record = {
                    $type: AppBskyCodeAssistant.defs.codeRequest.record.$type,
                    prompt,
                    context,
                    language,
                    timestamp: new Date().toISOString(),
                }

                const response = await this.agent.api.com.atproto.repo.createRecord({
                    repo: this.agent.session.did,
                    collection: AppBskyCodeAssistant.defs.codeRequest.record.$type,
                    record,
                })

                return response.uri
            },
            'submitCodeRequest'
        )
    }

    async getCodeRequests(): Promise<any[]> {
        return this.executeWithRetry(
            async () => {
                if (!this.agent.session?.did) {
                    throw new ATProtocolClientError('No active session', 'NO_SESSION')
                }

                const cacheKey = `requests:${this.agent.session.did}`
                const cachedRequests = await this.cache.get(cacheKey)
                
                if (cachedRequests) {
                    return JSON.parse(cachedRequests)
                }

                const response = await this.agent.api.com.atproto.repo.listRecords({
                    repo: this.agent.session.did,
                    collection: AppBskyCodeAssistant.defs.codeRequest.record.$type,
                })

                await this.cache.set(cacheKey, JSON.stringify(response.records), 'EX', 300) // Cache for 5 minutes
                return response.records
            },
            'getCodeRequests'
        )
    }

    async deleteCodeRequest(uri: string): Promise<void> {
        await this.executeWithRetry(
            async () => {
                if (!this.agent.session?.did) {
                    throw new ATProtocolClientError('No active session', 'NO_SESSION')
                }

                await this.agent.api.com.atproto.repo.deleteRecord({
                    repo: this.agent.session.did,
                    collection: AppBskyCodeAssistant.defs.codeRequest.record.$type,
                    rkey: uri.split('/').pop() || '',
                })

                // Invalidate cache
                const cacheKey = `requests:${this.agent.session.did}`
                await this.cache.del(cacheKey)
            },
            'deleteCodeRequest'
        )
    }

    async cleanup(): Promise<void> {
        await this.cache.quit()
    }
} 