import { ErrorReporting as GCPErrorReporting } from '@google-cloud/error-reporting'

export class ErrorReporting {
    private client: GCPErrorReporting
    
    constructor(config: { projectId: string, serviceContext: { service: string, version: string } }) {
        this.client = new GCPErrorReporting({
            projectId: config.projectId,
            reportMode: 'production',
            serviceContext: config.serviceContext,
        })
    }

    captureError(error: unknown, context?: Record<string, any>) {
        if (error instanceof Error) {
            this.client.report(error, {
                ...context,
                timestamp: new Date(),
            })
        } else {
            this.client.report(new Error(String(error)), {
                ...context,
                timestamp: new Date(),
                originalError: error,
            })
        }
    }

    async flush(): Promise<void> {
        await this.client.flush()
    }
} 