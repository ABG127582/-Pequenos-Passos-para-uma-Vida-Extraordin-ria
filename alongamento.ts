// alongamento.ts
// This file contains the logic for the "Alongamento" (Stretching) page.

// Re-declare window interface to inform TypeScript about the global function
declare global {
    interface Window {
        openImageViewer: (src: string, alt?: string) => void;
    }
}

/**
 * Sets up event listeners for the stretching page.
 */
export function setup(): void {
    const page = document.getElementById('page-alongamento');
    if (!page) {
        console.warn("Stretching page container (#page-alongamento) not found.");
        return;
    }

    const stretchingGuideImage = page.querySelector('.stretching-guide-image-container img') as HTMLImageElement;
    if (stretchingGuideImage) {
        stretchingGuideImage.addEventListener('click', () => {
            // Use the global function to open the image viewer modal
            window.openImageViewer(stretchingGuideImage.src, stretchingGuideImage.alt);
        });
    }
}

/**
 * This function is called by the router when the stretching page is shown.
 * Currently, there is no dynamic content to refresh.
 */
export function show(): void {
    // The page is static, so no specific actions are needed on show.
    // Ensure the page scrolls to the top on view.
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }
}