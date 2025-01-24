interface RetryOptions {
    retries: number
    factor: number
    minTimeout: number
    maxTimeout: number
}

export async function retry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    let lastError: Error | undefined
    let attempt = 0

    while (attempt < options.retries) {
        try {
            return await operation()
        } catch (error) {
            // Don't retry if it's a custom error type
            if (error && typeof error === 'object' && 'name' in error && error.name === 'ATProtocolClientError') {
                throw error
            }

            lastError = error instanceof Error ? error : new Error(String(error))
            attempt++

            if (attempt === options.retries) {
                throw lastError
            }

            const timeout = Math.min(
                options.minTimeout * Math.pow(options.factor, attempt),
                options.maxTimeout
            )

            await new Promise(resolve => setTimeout(resolve, timeout))
        }
    }

    throw lastError
} 