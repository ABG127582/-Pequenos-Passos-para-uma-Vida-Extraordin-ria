import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';
import { confirmAction, showMedalAnimation, awardMedalForCategory } from './utils';
import { STORAGE_KEYS } from './constants';
import { storageService } from './storage';

// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

interface Asset {
    id: string;
    name: string;
    purchaseDate: string;
}

// Re-declare window interface
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    }
}

// --- Module-scoped state ---
let goals: Goal[] = [];
let assets: Asset[] = [];
let editingAssetId: string | null = null;

const defaultGoals: Goal[] = [
    { id: 'financeira-1', text: 'Registrar todas as despesas do dia', completed: false },
    { id: 'financeira-2', text: 'Revisar o orçamento semanal e ajustar se necessário', completed: false },
    { id: 'financeira-3', text: 'Transferir valor para a reserva de emergência', completed: false },
    { id: 'financeira-4', text: 'Estudar por 15 minutos sobre um tipo de investimento (ex: Tesouro Selic)', completed: false },
];

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    // Goals
    goalsList: null as HTMLUListElement | null,
    goalsForm: null as HTMLFormElement | null,
    goalInput: null as HTMLInputElement | null,
    // Action Hub
    actionHub: null as HTMLElement | null,
    // Asset Replacement
    assetList: null as HTMLTableSectionElement | null,
    assetForm: null as HTMLFormElement | null,
    assetNameInput: null as HTMLInputElement | null,
    assetPurchaseDateInput: null as HTMLInputElement | null,
    // Asset Modal
    assetModal: null as HTMLElement | null,
    assetModalForm: null as HTMLFormElement | null,
    assetModalCloseBtn: null as HTMLButtonElement | null,
    assetModalCancelBtn: null as HTMLButtonElement | null,
    saveAssetEditBtn: null as HTMLButtonElement | null,
    assetNameEditInput: null as HTMLInputElement | null,
    assetPurchaseDateEditInput: null as HTMLInputElement | null,
};


// --- Helper function for drag-and-drop ---
function getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
    const draggableElements = [...container.querySelectorAll<HTMLElement>('li:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null }).element;
}


// --- ASSET REPLACEMENT ---
const renderAssets = () => {
    if (!elements.assetList) return;
    elements.assetList.innerHTML = '';

    if (assets.length === 0) {
        elements.assetList.innerHTML = `<tr><td colspan="4" class="empty-list-placeholder">Nenhum item adicionado.</td></tr>`;
        return;
    }

    assets.forEach(asset => {
        const purchaseDate = new Date(asset.purchaseDate + 'T00:00:00');
        const replacementDate = new Date(purchaseDate);
        replacementDate.setFullYear(replacementDate.getFullYear() + 7);

        const row = document.createElement('tr');
        row.dataset.id = asset.id;
        row.innerHTML = `
            <td>${DOMPurify.sanitize(asset.name)}</td>
            <td>${purchaseDate.toLocaleDateString('pt-BR')}</td>
            <td>${replacementDate.toLocaleDateString('pt-BR')}</td>
            <td class="item-actions">
                <button class="action-btn edit-asset-btn edit" aria-label="Editar item"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-asset-btn delete" aria-label="Remover item"><i class="fas fa-trash"></i></button>
            </td>
        `;
        elements.assetList!.appendChild(row);
    });
};

const openAssetEditModal = (asset: Asset) => {
    if (!elements.assetModal) return;
    editingAssetId = asset.id;
    elements.assetNameEditInput!.value = asset.name;
    elements.assetPurchaseDateEditInput!.value = asset.purchaseDate;
    elements.assetModal.style.display = 'flex';
};

const closeAssetEditModal = () => {
    if (elements.assetModal) {
        elements.assetModal.style.display = 'none';
        editingAssetId = null;
    }
};

const handleSaveAssetEdit = (e: Event) => {
    e.preventDefault();
    if (!editingAssetId) return;

    const assetIndex = assets.findIndex(a => a.id === editingAssetId);
    if (assetIndex === -1) return;

    const newName = elements.assetNameEditInput!.value.trim();
    const newDate = elements.assetPurchaseDateEditInput!.value;

    if (!newName || !newDate) {
        window.showToast('Nome do item e data são obrigatórios.', 'warning');
        return;
    }

    assets[assetIndex].name = newName;
    assets[assetIndex].purchaseDate = newDate;

    storageService.set(STORAGE_KEYS.FINANCE_ASSETS, assets);
    renderAssets();
    closeAssetEditModal();
    window.showToast('Item atualizado com sucesso!', 'success');
};

const handleAddAsset = (e: Event) => {
    e.preventDefault();
    const name = elements.assetNameInput!.value.trim();
    const purchaseDate = elements.assetPurchaseDateInput!.value;

    if (!name || !purchaseDate) {
        window.showToast('Por favor, preencha o nome e a data de compra do item.', 'warning');
        return;
    }
    
    const newAsset: Asset = {
        id: Date.now().toString(),
        name,
        purchaseDate,
    };
    
    assets.push(newAsset);
    storageService.set(STORAGE_KEYS.FINANCE_ASSETS, assets);
    renderAssets();
    elements.assetForm!.reset();
};

const handleAssetListClick = async (e: Event) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr');
    if (!row || !row.dataset.id) return;
    const assetId = row.dataset.id;
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;


    const editBtn = target.closest('.edit-asset-btn');
    if (editBtn) {
        openAssetEditModal(asset);
        return;
    }

    const deleteBtn = target.closest('.delete-asset-btn');
    if (deleteBtn) {
        const confirmed = await confirmAction(`Tem certeza que deseja remover "${asset.name}" do planejamento?`);
        if (confirmed) {
            assets = assets.filter(a => a.id !== assetId);
            storageService.set(STORAGE_KEYS.FINANCE_ASSETS, assets);
            renderAssets();
            window.showToast('Item removido do planejamento.', 'success');
        }
    }
};

// --- GOAL MANAGEMENT ---
const renderGoals = () => {
    if (!elements.goalsList) return;
    const currentlyEditingId = elements.goalsList.querySelector('.item-edit-input')?.closest('li')?.dataset.id;
    elements.goalsList.innerHTML = '';

    if (goals.length === 0) {
        elements.goalsList.innerHTML = '<li class="empty-list-placeholder">Nenhum objetivo definido.</li>';
        return;
    }
    goals.forEach(goal => {
        const li = document.createElement('li');
        li.className = goal.completed ? 'completed' : '';
        li.dataset.id = goal.id;
        li.draggable = true;
        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${goal.completed ? 'checked' : ''} id="task-${goal.id}" aria-labelledby="task-label-${goal.id}">
            <label for="task-${goal.id}" class="item-text" id="task-label-${goal.id}">${DOMPurify.sanitize(goal.text)}</label>
            ${goal.time ? `<span class="item-time"><i class="fas fa-clock"></i> ${goal.time}</span>` : ''}
            <div class="item-actions">
                <button class="action-btn edit-btn edit" aria-label="Editar objetivo"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn delete" aria-label="Apagar objetivo"><i class="fas fa-trash"></i></button>
            </div>
        `;
        elements.goalsList!.appendChild(li);
    });

    if (currentlyEditingId) {
        const liToEdit = elements.goalsList.querySelector(`li[data-id="${currentlyEditingId}"]`) as HTMLLIElement | null;
        if (liToEdit) enterEditMode(liToEdit);
    }
};


// --- EDITING LOGIC ---
const enterEditMode = (li: HTMLLIElement) => {
    li.classList.add('editing');
    li.draggable = false;
    const label = li.querySelector('.item-text') as HTMLLabelElement;
    const currentText = goals.find(g => g.id === li.dataset.id)?.text || '';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'item-edit-input';
    input.value = currentText;
    
    label.style.display = 'none';
    const checkbox = li.querySelector('.task-checkbox');
    checkbox?.parentElement?.insertBefore(input, label);

    input.focus();
    input.select();

    const saveEdit = () => {
        const newText = input.value.trim();
        const goalId = li.dataset.id;

        if (newText && goalId) {
            const goal = goals.find(g => g.id === goalId);
            if (goal) {
                goal.text = newText;
                storageService.set(STORAGE_KEYS.FINANCE_GOALS, goals);
            }
        }
        renderGoals();
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur(); // Trigger save
        } else if (e.key === 'Escape') {
            input.removeEventListener('blur', saveEdit);
            renderGoals(); // Cancel edit
        }
    });
};


const handleGoalAction = (e: Event) => {
    const target = e.target as HTMLElement;
    const li = target.closest('li');
    if (!li || !li.dataset.id) return;
    
    if (li.classList.contains('editing')) return;

    const goalId = li.dataset.id;
    const goalIndex = goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) return;

    if (target.closest('.edit-btn')) {
        e.stopPropagation();
        enterEditMode(li);
    } else if (target.closest('.delete-btn')) {
        goals.splice(goalIndex, 1);
        storageService.set(STORAGE_KEYS.FINANCE_GOALS, goals);
        renderGoals();
    } else if (target.matches('.task-checkbox') || target.closest('.item-text')) {
        const goal = goals[goalIndex];
        const wasCompleted = goal.completed;
        goal.completed = !goal.completed;

        if (goal.completed && !wasCompleted) {
            showMedalAnimation(li);
            awardMedalForCategory('financeira');
        }

        storageService.set(STORAGE_KEYS.FINANCE_GOALS, goals);
        renderGoals();
    }
};

const handleAddGoal = (e: Event) => {
    e.preventDefault();
    const text = elements.goalInput!.value.trim();
    if (text) {
        goals.unshift({ id: Date.now().toString(), text, completed: false });
        elements.goalInput!.value = '';
        storageService.set(STORAGE_KEYS.FINANCE_GOALS, goals);
        renderGoals();
    }
};

const handleActionHubClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.add-to-plan-btn');
    if (!button) return;

    const routineBlock = button.closest<HTMLElement>('.routine-block');
    if (!routineBlock) return;

    const description = routineBlock.dataset.description;
    const category = routineBlock.dataset.category as TaskCategory;

    if (description && category) {
        openScheduleModal(undefined, { description, category });
    }
};

// --- LIFECYCLE FUNCTIONS ---
export function setup() {
    const page = document.getElementById('page-financeira');
    if (!page) return;

    elements.pageContainer = page;
    elements.goalsList = page.querySelector('#financeira-metas-list') as HTMLUListElement;
    elements.goalsForm = page.querySelector('#financeira-metas-form') as HTMLFormElement;
    elements.goalInput = page.querySelector('#financeira-meta-input') as HTMLInputElement;
    elements.actionHub = page.querySelector('#do-action-hub') as HTMLElement;
    elements.assetList = page.querySelector('#asset-replacement-list') as HTMLTableSectionElement;
    elements.assetForm = page.querySelector('#add-asset-form') as HTMLFormElement;
    elements.assetNameInput = page.querySelector('#asset-name-input') as HTMLInputElement;
    elements.assetPurchaseDateInput = page.querySelector('#asset-purchase-date-input') as HTMLInputElement;
    
    // Asset Modal Elements
    elements.assetModal = document.getElementById('asset-modal');
    elements.assetModalForm = document.getElementById('asset-edit-form') as HTMLFormElement;
    elements.assetModalCloseBtn = document.getElementById('asset-modal-close-btn') as HTMLButtonElement;
    elements.assetModalCancelBtn = document.getElementById('asset-modal-cancel-btn') as HTMLButtonElement;
    elements.saveAssetEditBtn = document.getElementById('save-asset-edit-btn') as HTMLButtonElement;
    elements.assetNameEditInput = document.getElementById('asset-name-edit-input') as HTMLInputElement;
    elements.assetPurchaseDateEditInput = document.getElementById('asset-purchase-date-edit-input') as HTMLInputElement;


    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);
    elements.actionHub?.addEventListener('click', handleActionHubClick);
    elements.assetForm?.addEventListener('submit', handleAddAsset);
    elements.assetList?.addEventListener('click', handleAssetListClick);

    // Asset Modal Listeners
    elements.assetModalCloseBtn?.addEventListener('click', closeAssetEditModal);
    elements.assetModalCancelBtn?.addEventListener('click', closeAssetEditModal);
    elements.assetModalForm?.addEventListener('submit', handleSaveAssetEdit);

    // --- Drag-and-Drop Listeners ---
    elements.goalsList?.addEventListener('dragstart', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'LI') {
            setTimeout(() => target.classList.add('dragging'), 0);
        }
    });

    elements.goalsList?.addEventListener('dragend', (e) => {
        (e.target as HTMLElement).classList.remove('dragging');
    });

    elements.goalsList?.addEventListener('dragover', (e) => {
        e.preventDefault();
        const list = elements.goalsList!;
        const draggingItem = list.querySelector('.dragging');
        if (!draggingItem) return;

        const afterElement = getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
            list.appendChild(draggingItem);
        } else {
            list.insertBefore(draggingItem, afterElement);
        }
    });
    
    elements.goalsList?.addEventListener('drop', (e) => {
        e.preventDefault();
        const list = elements.goalsList!;
        if (!list.querySelector('.dragging')) return;

        const newOrderedIds = Array.from(list.querySelectorAll('li')).map(li => li.dataset.id);
        goals.sort((a, b) => (newOrderedIds.indexOf(a.id) || 0) - (newOrderedIds.indexOf(b.id) || 0));
        
        storageService.set(STORAGE_KEYS.FINANCE_GOALS, goals);
    });
}

export function show() {
    const savedGoals = storageService.get<Goal[]>(STORAGE_KEYS.FINANCE_GOALS);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : [...defaultGoals];
    
    const savedAssets = storageService.get<Asset[]>(STORAGE_KEYS.FINANCE_ASSETS);
    if (savedAssets && savedAssets.length > 0) {
        assets = savedAssets;
    } else {
        assets = [
            { id: 'default-1', name: 'Notebook', purchaseDate: '2014-01-01' },
            { id: 'default-2', name: 'Geladeira', purchaseDate: '2015-01-01' },
            { id: 'default-3', name: 'Cama de casal', purchaseDate: '2015-01-01' },
            { id: 'default-4', name: 'Air fryer', purchaseDate: '2015-01-01' },
            { id: 'default-5', name: 'Lancheira', purchaseDate: '2015-01-01' },
            { id: 'default-6', name: 'Sofá', purchaseDate: '2025-01-01' },
            { id: 'default-7', name: 'Video game (PS2, PS3, PS4)', purchaseDate: '2018-01-01' },
            { id: 'default-8', name: 'Mesa escritório', purchaseDate: '2021-01-01' },
            { id: 'default-9', name: 'Mesas de apoio', purchaseDate: '2022-01-01' },
            { id: 'default-10', name: 'Banquetas vermelhas', purchaseDate: '2022-01-01' },
            { id: 'default-11', name: 'Cama de solteiro', purchaseDate: '2022-01-01' },
            { id: 'default-12', name: 'Fogão', purchaseDate: '2021-01-01' },
            { id: 'default-13', name: 'Televisão', purchaseDate: '2022-01-01' },
        ];
    }
    
    renderGoals();
    renderAssets();
}