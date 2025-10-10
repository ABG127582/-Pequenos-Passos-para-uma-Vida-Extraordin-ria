// errorHandler.ts
// A global error handling service.

import { showToast } from './utils';

class ErrorHandler {
    /**
     * Handles and logs an error, then shows a user-friendly toast notification.
     * @param error The error object.
     * @param context A string providing context for where the error occurred.
     */
    handle(error: Error, context: string) {
        console.error(`Error in ${context}:`, error);
        
        // In a real application, you would log this to an external service
        // like Sentry, LogRocket, etc.
        // this.logToService(error, context);
        
        // Show a generic, friendly message to the user
        showToast(
            'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.',
            'error'
        );
    }

    /**
     * Wraps an asynchronous function with error handling.
     * @param fn The async function to execute.
     * @param context A string providing context for where the error might occur.
     * @returns The result of the function, or null if an error occurred.
     */
    async wrap<T>(
        fn: () => Promise<T>,
        context: string
    ): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.handle(error as Error, context);
            return null;
        }
    }
}

// Export a singleton instance of the service
export const errorHandler = new ErrorHandler();