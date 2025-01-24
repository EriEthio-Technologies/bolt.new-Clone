import { execSync } from 'child_process'
import { ATProtocolClient } from '../src/services/atProtocol/client'
import { Monitoring } from '../src/monitoring'
import { ErrorReporting } from '../src/monitoring/error'

async function runPreDeploymentChecks() {
    console.log('Running pre-deployment checks...')

    // 1. Run tests
    console.log('\n🧪 Running tests...')
    execSync('npm test', { stdio: 'inherit' })

    // 2. Type checking
    console.log('\n📝 Running type check...')
    execSync('npm run typecheck', { stdio: 'inherit' })

    // 3. Linting
    console.log('\n🔍 Running linter...')
    execSync('npm run lint', { stdio: 'inherit' })

    // 4. Check AT Protocol connectivity
    console.log('\n🌐 Checking AT Protocol connectivity...')
    const client = new ATProtocolClient({
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        rateLimit: { tokensPerInterval: 100, interval: '1m' },
        monitoring: new Monitoring({
            projectId: process.env.GCP_PROJECT_ID || 'test',
            namespace: 'pre-deploy'
        }),
        errorReporting: new ErrorReporting({
            projectId: process.env.GCP_PROJECT_ID || 'test',
            serviceContext: {
                service: 'pre-deploy',
                version: '1.0.0'
            }
        })
    })

    try {
        await client.connect(
            process.env.AT_PROTOCOL_TEST_USER || '',
            process.env.AT_PROTOCOL_TEST_PASS || ''
        )
        console.log('✅ AT Protocol connection successful')
    } catch (error) {
        console.error('❌ AT Protocol connection failed:', error)
        process.exit(1)
    }

    // 5. Check Redis connectivity
    console.log('\n📦 Checking Redis connectivity...')
    try {
        await client.cleanup() // This will test Redis connection
        console.log('✅ Redis connection successful')
    } catch (error) {
        console.error('❌ Redis connection failed:', error)
        process.exit(1)
    }

    console.log('\n✅ All pre-deployment checks passed!')
}

runPreDeploymentChecks().catch(error => {
    console.error('Pre-deployment checks failed:', error)
    process.exit(1)
}) 