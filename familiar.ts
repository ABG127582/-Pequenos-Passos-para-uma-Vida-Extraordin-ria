import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';
import { storageService } from './storage';
import { STORAGE_KEYS } from './constants';
import { showMedalAnimation, awardMedalForCategory } from './utils';

// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

// Re-declare window interface
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    }
}

// --- Module-scoped state ---
let goals: Goal[] = [];

const defaultGoals: Goal[] = [
    { id: 'familiar-1', text: 'Praticar escuta ativa em uma conversa com um familiar', completed: false },
    { id: 'familiar-2', text: 'Agendar um "tempo de qualidade" sem distrações (ex: noite de jogos, caminhada)', completed: false },
    { id: 'familiar-3', text: 'Expressar apreciação a um membro da família (antídoto para crítica)', completed: false },
    { id: 'familiar-4', text: 'Identificar e praticar uma das 5 "Linguagens do Amor" com um ente querido', completed: false },
];

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    goalsList: null as HTMLUListElement | null,
    goalsForm: null as HTMLFormElement | null,
    goalInput: null as HTMLInputElement | null,
    actionHub: null as HTMLElement | null,
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


// --- RENDER FUNCTION ---
const renderGoals = () => {
    if (!elements.goalsList) return;
    const currentlyEditingId = elements.goalsList.querySelector('.item-edit-input')?.closest('li')?.dataset.id;
    elements.goalsList.innerHTML = '';

    if (goals.length === 0) {
        elements.goalsList.innerHTML = '<li class="empty-list-placeholder">Nenhum objetivo definido ainda.</li>';
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
                storageService.set(STORAGE_KEYS.FAMILIAR_GOALS, goals);
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


// --- EVENT HANDLERS ---
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
        storageService.set(STORAGE_KEYS.FAMILIAR_GOALS, goals);
        renderGoals();
    } else if (target.matches('.task-checkbox') || target.closest('.item-text')) {
        const goal = goals[goalIndex];
        const wasCompleted = goal.completed;
        goal.completed = !goal.completed;

        if (goal.completed && !wasCompleted) {
            showMedalAnimation(li);
            awardMedalForCategory('familiar');
        }

        storageService.set(STORAGE_KEYS.FAMILIAR_GOALS, goals);
        renderGoals();
    }
};

const handleAddGoal = (e: Event) => {
    e.preventDefault();
    const text = elements.goalInput!.value.trim();
    if (text) {
        goals.unshift({ id: Date.now().toString(), text, completed: false });
        elements.goalInput!.value = '';
        storageService.set(STORAGE_KEYS.FAMILIAR_GOALS, goals);
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
    const page = document.getElementById('page-familiar');
    if (!page) return;

    elements.pageContainer = page;
    elements.goalsList = page.querySelector('#familiar-metas-list');
    elements.goalsForm = page.querySelector('#familiar-metas-form');
    elements.goalInput = page.querySelector('#familiar-meta-input');

    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);

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
        
        storageService.set(STORAGE_KEYS.FAMILIAR_GOALS, goals);
    });
}

export function show() {
    const savedGoals: Goal[] | null = storageService.get(STORAGE_KEYS.FAMILIAR_GOALS);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : [...defaultGoals];
    renderGoals();
}