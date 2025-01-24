import { ATProtocolClient } from './atProtocol/client'
import { Monitoring } from '../monitoring'
import { ErrorReporting } from '../monitoring/error'
import config from '../config'

let atProtocolClient: ATProtocolClient | null = null

export async function getATProtocolClient(): Promise<ATProtocolClient> {
    if (!atProtocolClient) {
        const monitoring = new Monitoring({
            projectId: config.gcp.projectId,
            namespace: config.gcp.monitoring.namespace,
        })

        const errorReporting = new ErrorReporting({
            projectId: config.gcp.projectId,
            serviceContext: {
                service: config.gcp.errorReporting.service,
                version: config.gcp.errorReporting.version,
            },
        })

        atProtocolClient = new ATProtocolClient({
            redisUrl: config.redis.url,
            rateLimit: config.atProtocol.rateLimit,
            monitoring,
            errorReporting,
        })
    }

    return atProtocolClient
}

export async function cleanup(): Promise<void> {
    if (atProtocolClient) {
        await atProtocolClient.cleanup()
        atProtocolClient = null
    }
} 