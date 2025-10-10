// utils.ts
// This module contains globally shared helper functions.
import { storageService } from './storage';
import { STORAGE_KEYS } from './constants';

/**
 * Displays a toast notification.
 * @param message The message to display.
 * @param type The type of toast (info, success, warning, error).
 */
export function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const toastContainer = document.getElementById('toast-notification-container');
    if (!toastContainer) {
        console.warn('Toast container not found.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Starts speech recognition for an input field after ensuring microphone permission.
 * @param button The microphone button that was clicked.
 */
export async function startSpeechRecognition(button: HTMLButtonElement): Promise<void> {
    // @ts-ignore (for browser compatibility with webkitSpeechRecognition)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Seu navegador não suporta reconhecimento de voz.", 'warning');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.error('Microphone access denied:', err);
        showToast('Permissão para o microfone foi negada. Por favor, habilite nas configurações do seu navegador.', 'error');
        return;
    }

    const wrapper = button.closest('.input-wrapper');
    if (!wrapper) return;
    const targetInput = wrapper.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
    if (!targetInput) return;

    button.disabled = true;
    button.classList.add('listening');

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        targetInput.value = speechResult;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    };

    recognition.onspeechend = () => {
        recognition.stop();
    };
    
    recognition.onend = () => {
        button.disabled = false;
        button.classList.remove('listening');
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        let message = 'Ocorreu um erro no reconhecimento de voz.';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            message = 'Permissão para o microfone foi negada.';
        } else if (event.error === 'no-speech') {
            message = 'Nenhuma fala foi detectada. Tente falar mais perto do microfone.';
        }
        showToast(message, 'error');
    };
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after `wait` milliseconds have elapsed since the last time it was invoked.
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns A new debounced function.
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | undefined;

    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        const context = this;
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(context, args), wait);
    };
}


/**
 * Shows a custom confirmation modal and returns a promise that resolves with the user's choice.
 * @param message The message to display in the confirmation dialog.
 * @returns A promise that resolves to `true` if "Yes" is clicked, and `false` otherwise.
 */
export function confirmAction(message: string): Promise<boolean> {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-modal-message');
        const yesBtn = document.getElementById('confirm-modal-yes');
        const noBtn = document.getElementById('confirm-modal-no');

        if (!modal || !messageEl || !yesBtn || !noBtn) {
            // Fallback to native confirm if the custom modal is not in the DOM
            resolve(window.confirm(message));
            return;
        }
        
        messageEl.textContent = message;
        modal.style.display = 'flex';

        const cleanup = (result: boolean) => {
            modal.style.display = 'none';
            // Use .cloneNode(true) to remove all event listeners easily
            const newYes = yesBtn.cloneNode(true);
            const newNo = noBtn.cloneNode(true);
            yesBtn.parentNode?.replaceChild(newYes, yesBtn);
            noBtn.parentNode?.replaceChild(newNo, noBtn);
            resolve(result);
        };
        
        yesBtn.addEventListener('click', () => cleanup(true), { once: true });
        noBtn.addEventListener('click', () => cleanup(false), { once: true });
        modal.addEventListener('click', (e) => {
             if (e.target === modal) {
                cleanup(false);
             }
        }, { once: true });
    });
}

/**
 * Traps focus within a given element (typically a modal) for accessibility.
 * @param element The container element to trap focus within.
 * @returns A function to remove the event listeners when the modal is closed.
 */
export function trapFocus(element: HTMLElement): () => void {
    const focusableEls = element.querySelectorAll<HTMLElement>(
        'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])'
    );
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];

    const keydownHandler = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') {
            return;
        }

        if (e.shiftKey) { /* shift + tab */
            if (document.activeElement === firstFocusableEl) {
                lastFocusableEl.focus();
                e.preventDefault();
            }
        } else { /* tab */
            if (document.activeElement === lastFocusableEl) {
                firstFocusableEl.focus();
                e.preventDefault();
            }
        }
    };

    element.addEventListener('keydown', keydownHandler);

    // Return a cleanup function
    return () => {
        element.removeEventListener('keydown', keydownHandler);
    };
}

/**
 * Displays a medal animation over a target element.
 * @param targetElement The element to display the animation on top of.
 */
export function showMedalAnimation(targetElement: HTMLElement) {
    const medal = document.createElement('div');
    medal.className = 'medal-animation';
    medal.innerHTML = '<i class="fas fa-medal"></i>';
    document.body.appendChild(medal);

    const targetRect = targetElement.getBoundingClientRect();
    // Position it in the center of the target element initially
    medal.style.top = `${targetRect.top + targetRect.height / 2}px`;
    medal.style.left = `${targetRect.left + targetRect.width / 2}px`;

    // Trigger the animation
    requestAnimationFrame(() => {
        medal.style.animation = 'medal-pop-and-fade 1.5s ease-out forwards';
    });

    // Remove the element after the animation is done
    setTimeout(() => {
        medal.remove();
    }, 1500);
}

/**
 * Awards a medal for a specific health category for the current day.
 * @param category The category key (e.g., 'fisica', 'mental').
 */
export function awardMedalForCategory(category: string) {
    const today = new Date().toISOString().split('T')[0];
    const dailyMedals = storageService.get<{ [key: string]: string[] }>(STORAGE_KEYS.DAILY_MEDALS) || {};

    if (!dailyMedals[today]) {
        dailyMedals[today] = [];
    }

    if (!dailyMedals[today].includes(category)) {
        dailyMedals[today].push(category);
        storageService.set(STORAGE_KEYS.DAILY_MEDALS, dailyMedals);
    }
}