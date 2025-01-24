import { getATProtocolClient } from '../services/factory'

export async function GET() {
    try {
        // Check AT Protocol client
        const client = await getATProtocolClient()
        
        // Basic health check - verify Redis connection
        await client.cleanup()
        await client.connect(
            process.env.AT_PROTOCOL_HEALTH_USER || '',
            process.env.AT_PROTOCOL_HEALTH_PASS || ''
        )

        return new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        })
    } catch (error) {
        return new Response(JSON.stringify({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json'
            }
        })
    }
} 