import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BskyAgent } from '@atproto/api'
import { ATProtocolClient } from '../client'
import { Redis } from 'ioredis'
import { RateLimiter } from 'limiter'

// Mock dependencies
vi.mock('ioredis')
vi.mock('limiter')

// Create a mock BskyAgent instance
const mockBskyAgent = {
    login: vi.fn().mockResolvedValue({ success: true }),
    resumeSession: vi.fn().mockResolvedValue(true),
    session: null as any,
    api: {
        com: {
            atproto: {
                repo: {
                    createRecord: vi.fn().mockResolvedValue({ uri: 'test-uri' }),
                    listRecords: vi.fn().mockResolvedValue({ records: [] }),
                    deleteRecord: vi.fn().mockResolvedValue(true),
                },
            },
        },
    },
}

// Mock the BskyAgent constructor
vi.mock('@atproto/api', () => ({
    BskyAgent: vi.fn().mockImplementation(() => mockBskyAgent),
}))

describe('ATProtocolClient', () => {
    let client: ATProtocolClient
    const mockMonitoring = {
        gauge: vi.fn().mockReturnValue({ set: vi.fn() }),
        counter: vi.fn().mockReturnValue({ inc: vi.fn() }),
        histogram: vi.fn().mockReturnValue({ observe: vi.fn() }),
    }
    const mockErrorReporting = {
        captureError: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockBskyAgent.session = null
        mockBskyAgent.login.mockResolvedValue({ success: true })
        client = new ATProtocolClient({
            redisUrl: 'redis://localhost:6379',
            rateLimit: { tokensPerInterval: 100, interval: '1m' },
            monitoring: mockMonitoring as any,
            errorReporting: mockErrorReporting as any,
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('connect', () => {
        it('should successfully connect to AT Protocol', async () => {
            const result = await client.connect('test-user', 'test-pass')
            expect(result).toBe(true)
            expect(mockBskyAgent.login).toHaveBeenCalledWith({
                identifier: 'test-user',
                password: 'test-pass',
            })
        }, { timeout: 10000 })

        it('should handle connection errors', async () => {
            const error = new Error('Connection failed')
            mockBskyAgent.login.mockRejectedValueOnce(error)

            await expect(client.connect('test-user', 'test-pass')).rejects.toThrow('Failed to connect to AT Protocol')
            expect(mockErrorReporting.captureError).toHaveBeenCalledWith(
                error,
                expect.objectContaining({ context: 'connect' })
            )
        }, { timeout: 10000 })
    })

    describe('createSession', () => {
        it('should create a session successfully', async () => {
            // Set up a mock session
            const mockSession = { did: 'test-did' }
            mockBskyAgent.session = mockSession

            // Mock the session persistence callback
            await client.connect('test-user', 'test-pass')
            const persistCallback = vi.mocked(BskyAgent).mock.calls[0][0].persistSession
            persistCallback('create', mockSession)
            
            const session = await client.createSession()
            expect(session).toBeDefined()
            expect(mockBskyAgent.resumeSession).toHaveBeenCalled()
        }, { timeout: 10000 })

        it('should throw error when no active session exists', async () => {
            mockBskyAgent.session = null
            await expect(client.createSession()).rejects.toThrow('No active session')
        }, { timeout: 10000 })
    })

    describe('submitCodeRequest', () => {
        it('should submit code request successfully', async () => {
            mockBskyAgent.session = { did: 'test-did' }
            await client.connect('test-user', 'test-pass')
            const uri = await client.submitCodeRequest('test prompt', 'test context', 'typescript')
            expect(uri).toBe('test-uri')
            expect(mockBskyAgent.api.com.atproto.repo.createRecord).toHaveBeenCalled()
        }, { timeout: 10000 })
    })

    describe('getCodeRequests', () => {
        it('should get code requests successfully', async () => {
            mockBskyAgent.session = { did: 'test-did' }
            await client.connect('test-user', 'test-pass')
            const requests = await client.getCodeRequests()
            expect(Array.isArray(requests)).toBe(true)
            expect(mockBskyAgent.api.com.atproto.repo.listRecords).toHaveBeenCalled()
        }, { timeout: 10000 })
    })

    describe('deleteCodeRequest', () => {
        it('should delete code request successfully', async () => {
            mockBskyAgent.session = { did: 'test-did' }
            await client.connect('test-user', 'test-pass')
            await expect(client.deleteCodeRequest('test-uri')).resolves.not.toThrow()
            expect(mockBskyAgent.api.com.atproto.repo.deleteRecord).toHaveBeenCalled()
        }, { timeout: 10000 })
    })
}) 