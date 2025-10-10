// loadingManager.ts
// Manages a global loading state for the application.

class LoadingManager {
    private loadingOperations = new Set<string>();

    /**
     * Starts tracking a loading operation.
     * @param operationId A unique identifier for the operation.
     */
    start(operationId: string) {
        this.loadingOperations.add(operationId);
        this.updateUI();
    }

    /**
     * Stops tracking a loading operation.
     * @param operationId The unique identifier for the operation.
     */
    stop(operationId: string) {
        this.loadingOperations.delete(operationId);
        this.updateUI();
    }

    /**
     * Checks if any loading operations are currently active.
     * @returns `true` if loading, `false` otherwise.
     */
    isLoading(): boolean {
        return this.loadingOperations.size > 0;
    }

    /**
     * Updates the UI based on the current loading state.
     * Adds/removes a class to the body to show a global loading indicator (e.g., wait cursor).
     */
    private updateUI() {
        const isLoading = this.isLoading();
        document.body.classList.toggle('is-loading', isLoading);

        // Add a specific class to the body for cursor styling to avoid inheritance issues.
        if (isLoading) {
            document.body.classList.add('is-loading-cursor');
        } else {
            // Use a timeout to ensure the cursor change is noticeable and doesn't flicker on fast operations.
            setTimeout(() => {
                if (!this.isLoading()) {
                    document.body.classList.remove('is-loading-cursor');
                }
            }, 100); // 100ms delay
        }
    }
}

// Export a singleton instance of the service
export const loadingManager = new LoadingManager();