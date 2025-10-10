// modals.ts
// This module handles logic for globally accessible modals like the Contract and Image Viewer.

import { storageService } from './storage';
import { showToast, trapFocus } from './utils';
import { STORAGE_KEYS } from './constants';

// --- Contract Modal Logic ---
interface ContractData {
    name: string;
    cpf: string;
    birthdate: string;
    address: string;
    commitment: string;
    period: string;
    goals: string;
    signature: string;
    date: string;
}

let removeContractFocusTrap: (() => void) | null = null;
let lastFocusedElement: HTMLElement | null = null;


function loadContract() {
    const data: ContractData | null = storageService.get(STORAGE_KEYS.USER_CONTRACT);
    if (data) {
        (document.getElementById('contract-name') as HTMLInputElement).value = data.name || '';
        (document.getElementById('contract-cpf') as HTMLInputElement).value = data.cpf || '';
        (document.getElementById('contract-birthdate') as HTMLInputElement).value = data.birthdate || '';
        (document.getElementById('contract-address') as HTMLInputElement).value = data.address || '';
        (document.getElementById('contract-commitment') as HTMLTextAreaElement).value = data.commitment || '';
        (document.getElementById('contract-period') as HTMLInputElement).value = data.period || '';
        (document.getElementById('contract-goals') as HTMLTextAreaElement).value = data.goals || '';
        (document.getElementById('contract-signature') as HTMLInputElement).value = data.signature || '';
        (document.getElementById('contract-date') as HTMLInputElement).value = data.date || '';
    }
}

function saveContract() {
    const data: ContractData = {
        name: (document.getElementById('contract-name') as HTMLInputElement).value,
        cpf: (document.getElementById('contract-cpf') as HTMLInputElement).value,
        birthdate: (document.getElementById('contract-birthdate') as HTMLInputElement).value,
        address: (document.getElementById('contract-address') as HTMLInputElement).value,
        commitment: (document.getElementById('contract-commitment') as HTMLTextAreaElement).value,
        period: (document.getElementById('contract-period') as HTMLInputElement).value,
        goals: (document.getElementById('contract-goals') as HTMLTextAreaElement).value,
        signature: (document.getElementById('contract-signature') as HTMLInputElement).value,
        date: (document.getElementById('contract-date') as HTMLInputElement).value,
    };

    if (!data.name || !data.signature || !data.date) {
        showToast('Por favor, preencha pelo menos seu nome, a assinatura e a data.', 'warning');
        return;
    }

    storageService.set(STORAGE_KEYS.USER_CONTRACT, data);
    showToast('Contrato salvo com sucesso!', 'success');
    closeContractModal();
}

function printContract() {
    const form = document.getElementById('contract-form');
    if (!(form instanceof HTMLFormElement)) return;

    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(inputEl => {
        if (!(inputEl instanceof HTMLInputElement || inputEl instanceof HTMLTextAreaElement)) return;
        const input = inputEl;

        let displaySpan: HTMLElement;
        const nextEl = input.nextElementSibling;
        
        if (nextEl instanceof HTMLElement && nextEl.classList.contains('print-only-value')) {
            displaySpan = nextEl;
        } else {
            displaySpan = document.createElement('span');
            displaySpan.className = 'print-only-value';
            input.parentNode?.insertBefore(displaySpan, input.nextSibling);
        }

        if (input instanceof HTMLInputElement && input.type === 'date' && input.value) {
            displaySpan.textContent = new Date(input.value + 'T00:00:00').toLocaleDateString('pt-BR');
        } else {
            displaySpan.textContent = input.value;
        }
    });

    document.body.classList.add('printing-contract');
    window.print();
    document.body.classList.remove('printing-contract');
}

export function openContractModal() {
    const modal = document.getElementById('contract-modal');
    if (modal) {
        lastFocusedElement = document.activeElement as HTMLElement;
        loadContract();
        modal.style.display = 'flex';
        (modal.querySelector('input, textarea, button') as HTMLElement)?.focus();
        removeContractFocusTrap = trapFocus(modal);
    }
}

function closeContractModal() {
    const modal = document.getElementById('contract-modal');
    if (modal) {
        modal.style.display = 'none';
        if (removeContractFocusTrap) {
            removeContractFocusTrap();
            removeContractFocusTrap = null;
        }
        lastFocusedElement?.focus();
    }
}

function setupContractModal() {
    const modal = document.getElementById('contract-modal');
    const closeBtn = document.getElementById('contract-modal-close-btn');
    const cancelBtn = document.getElementById('contract-modal-cancel-btn');
    const saveBtn = document.getElementById('contract-modal-save-btn');
    const printBtn = document.getElementById('contract-modal-print-btn');

    closeBtn?.addEventListener('click', closeContractModal);
    cancelBtn?.addEventListener('click', closeContractModal);
    saveBtn?.addEventListener('click', saveContract);
    printBtn?.addEventListener('click', printContract);

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeContractModal();
        }
    });
}

// --- Image Viewer Modal Logic ---
function setupImageViewerModal() {
    const modal = document.getElementById('image-viewer-modal');
    const imgEl = document.getElementById('image-viewer-img') as HTMLImageElement;
    const closeBtn = document.getElementById('image-viewer-close-btn');

    const close = () => {
        if (modal) modal.style.display = 'none';
        if (imgEl) {
            imgEl.src = '';
            imgEl.alt = '';
        }
    };

    closeBtn?.addEventListener('click', close);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            close();
        }
    });

    window.openImageViewer = (src: string, alt: string = 'Imagem ampliada') => {
        if (modal && imgEl) {
            imgEl.src = src;
            imgEl.alt = alt;
            modal.style.display = 'flex';
        }
    };
}

/**
 * Initializes all global modals defined in index.html.
 */
export function setupModals() {
    setupContractModal();
    setupImageViewerModal();
}