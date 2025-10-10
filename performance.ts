// performance.ts
// A utility for monitoring the performance of critical functions.

const SYNC_WARN_THRESHOLD = 100; // ms
const ASYNC_WARN_THRESHOLD = 1000; // ms

class PerformanceMonitor {
    /**
     * Measures the execution time of a synchronous function.
     * @param name A descriptive name for the operation being measured.
     * @param fn The synchronous function to execute and measure.
     */
    measure(name: string, fn: () => void) {
        const start = performance.now();
        fn();
        const duration = performance.now() - start;
        
        if (duration > SYNC_WARN_THRESHOLD) {
            console.warn(`🐢 Slow operation: '${name}' took ${duration.toFixed(2)}ms`);
        } else {
            console.log(`🚀 Performance: '${name}' took ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Measures the execution time of an asynchronous function.
     * @param name A descriptive name for the operation being measured.
     * @param fn The asynchronous function to execute and measure.
     * @returns The result of the async function.
     */
    async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        
        if (duration > ASYNC_WARN_THRESHOLD) {
            console.warn(`🐢 Slow async operation: '${name}' took ${duration.toFixed(2)}ms`);
        } else {
            console.log(`🚀 Performance: '${name}' took ${duration.toFixed(2)}ms`);
        }
        
        return result;
    }
}

// Export a singleton instance of the service
export const performanceMonitor = new PerformanceMonitor();