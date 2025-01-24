import { EventEmitter } from 'events'
import { ATProtocolClient } from './client'
import { PerformanceMonitoring } from '../../monitoring/monitoring'

export class ATProtocolEventHandler extends EventEmitter {
    private client: ATProtocolClient
    private monitoring: PerformanceMonitoring

    constructor(client: ATProtocolClient, monitoring: PerformanceMonitoring) {
        super()
        this.client = client
        this.monitoring = monitoring
        this.setupEventListeners()
    }

    private setupEventListeners(): void {
        this.on('codeRequest', this.handleCodeRequest.bind(this))
        this.on('sessionExpired', this.handleSessionExpired.bind(this))
        this.on('error', this.handleError.bind(this))
    }

    private async handleCodeRequest(data: any): Promise<void> {
        try {
            const startTime = Date.now()
            await this.client.submitCodeRequest(
                data.prompt,
                data.context,
                data.language
            )
            const duration = Date.now() - startTime
            
            await this.monitoring.trackMetric('code_request_duration', duration)
        } catch (error) {
            this.emit('error', error)
        }
    }

    private async handleSessionExpired(): Promise<void> {
        try {
            await this.client.createSession()
            this.emit('sessionRestored')
        } catch (error) {
            this.emit('error', error)
        }
    }

    private handleError(error: Error): void {
        console.error('AT Protocol Event Handler Error:', error)
        this.monitoring.trackMetric('at_protocol_errors', 1)
    }
} 