/**
 * Helper function to handle unreachable code paths in TypeScript.
 * This function helps with type narrowing and runtime checks.
 * 
 * @param message - Optional message to include in the error
 * @throws {Error} Always throws an error with the provided message
 */
export function unreachable(message: string): never {
    throw new Error(`Unreachable code path: ${message}`)
} 