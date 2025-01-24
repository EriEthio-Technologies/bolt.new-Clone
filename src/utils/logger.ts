import { Logging } from '@google-cloud/logging'
import config from '../config'

interface LoggerOptions {
    projectId: string
    logName: string
}

class Logger {
    private logging: Logging
    private logName: string

    constructor(options: LoggerOptions) {
        this.logging = new Logging({ projectId: options.projectId })
        this.logName = options.logName
    }

    private async writeLog(severity: string, message: string, metadata?: Record<string, any>) {
        const log = this.logging.log(this.logName)
        const entry = log.entry({
            severity,
            timestamp: new Date(),
            ...metadata,
            message,
        })
        await log.write(entry)
    }

    async debug(message: string, metadata?: Record<string, any>) {
        await this.writeLog('DEBUG', message, metadata)
    }

    async info(message: string, metadata?: Record<string, any>) {
        await this.writeLog('INFO', message, metadata)
    }

    async warn(message: string, metadata?: Record<string, any>) {
        await this.writeLog('WARNING', message, metadata)
    }

    async error(message: string, metadata?: Record<string, any>) {
        await this.writeLog('ERROR', message, metadata)
    }
}

export function createScopedLogger(scope: string): Logger {
    return new Logger({
        projectId: config.gcp.projectId,
        logName: `${config.gcp.monitoring.namespace}-${scope}`,
    })
} 