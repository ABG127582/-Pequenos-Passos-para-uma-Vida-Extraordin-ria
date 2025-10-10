import DOMPurify from 'dompurify';
import { storageService } from './storage';
import { STORAGE_KEYS } from './constants';
import { confirmAction } from './utils';

// --- TYPE DEFINITIONS ---
export type TaskCategory = 'Física' | 'Mental' | 'Financeira' | 'Familiar' | 'Profissional' | 'Social' | 'Espiritual' | 'Preventiva' | 'Pessoal';

export interface ScheduledTask {
    id: string;
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
    description: string;
    completed: boolean;
    category: TaskCategory;
}

interface StoicReflection {
    sleep: string;
    dayReview: string;
    bodyScan: string;
    mentalCheck: string;
    premeditation: string;
}

interface DailyPlan {
    tasks: ScheduledTask[];
    reflection: StoicReflection;
}

// Re-declare global functions from index.tsx
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    }
}

// --- MODULE-SCOPED VARIABLES ---

let currentDate: string;
let dailyPlan: DailyPlan;
let editingTaskId: string | null = null;

const defaultPlan: DailyPlan = {
    tasks: [
        { id: '1', startTime: '06:00', endTime: '06:30', description: 'Acordar, Hidratação e Meditação', completed: false, category: 'Mental' },
        { id: '2', startTime: '06:30', endTime: '07:30', description: 'Exercício Físico', completed: false, category: 'Física' },
        { id: '3', startTime: '07:30', endTime: '08:30', description: 'Café da Manhã Nutritivo', completed: false, category: 'Preventiva' },
        { id: '4', startTime: '08:30', endTime: '09:00', description: 'Planejar o Dia (Definir 3 Prioridades)', completed: false, category: 'Profissional' },
        { id: '5', startTime: '09:00', endTime: '10:30', description: 'Bloco de Trabalho Focado 1', completed: false, category: 'Profissional' },
        { id: '6', startTime: '10:30', endTime: '10:45', description: 'Pausa Curta (Café, Alongamento)', completed: false, category: 'Física' },
        { id: '7', startTime: '10:45', endTime: '12:00', description: 'Bloco de Trabalho Focado 2', completed: false, category: 'Profissional' },
        { id: '8', startTime: '12:00', endTime: '13:00', description: 'Almoço Consciente (Sem telas)', completed: false, category: 'Mental' },
        { id: '9', startTime: '13:00', endTime: '15:00', description: 'Trabalho Focado ou Reuniões', completed: false, category: 'Profissional' },
        { id: '10', startTime: '15:00', endTime: '15:15', description: 'Pausa para Meditação ou Respiração', completed: false, category: 'Mental' },
        { id: '11', startTime: '15:15', endTime: '17:00', description: 'Tarefas Administrativas e E-mails', completed: false, category: 'Profissional' },
        { id: '12', startTime: '17:00', endTime: '17:30', description: 'Ritual de Encerramento do Trabalho', completed: false, category: 'Mental' },
        { id: '13', startTime: '17:30', endTime: '19:00', description: 'Tempo Livre / Hobby / Social', completed: false, category: 'Pessoal' },
        { id: '14', startTime: '19:00', endTime: '20:00', description: 'Jantar e Conexão Familiar', completed: false, category: 'Familiar' },
        { id: '15', startTime: '20:00', endTime: '21:00', description: 'Aprendizado (Leitura, Curso)', completed: false, category: 'Profissional' },
        { id: '16', startTime: '21:00', endTime: '22:00', description: 'Relaxamento (Sem telas)', completed: false, category: 'Mental' },
        { id: '17', startTime: '22:00', endTime: '22:15', description: 'Diário de Gratidão / Reflexão do Dia', completed: false, category: 'Espiritual' },
    ],
    reflection: {
        sleep: '',
        dayReview: '',
        bodyScan: '',
        mentalCheck: '',
        premeditation: '',
    }
};

const elements = {
    pageContainer: null as HTMLElement | null,
    dateInput: null as HTMLInputElement | null,
    progressRing: null as SVGCircleElement | null,
    progressText: null as SVGTextElement | null,
    scheduleList: null as HTMLUListElement | null,
    addEventBtn: null as HTMLButtonElement | null,
    // Modal Elements
    modal: null as HTMLElement | null,
    modalTitle: null as HTMLElement | null,
    modalForm: null as HTMLFormElement | null,
    modalCloseBtn: null as HTMLButtonElement | null,
    modalCancelBtn: null as HTMLButtonElement | null,
    modalSaveBtn: null as HTMLButtonElement | null,
    modalDeleteBtn: null as HTMLButtonElement | null,
    modalDescriptionInput: null as HTMLTextAreaElement | null,
    modalStartTimeInput: null as HTMLInputElement | null,
    modalEndTimeInput: null as HTMLInputElement | null,
    modalCategorySelect: null as HTMLSelectElement | null,
};

// --- DATA HANDLING ---
const getStorageKey = (date: string): string => `${STORAGE_KEYS.DAILY_PLAN_PREFIX}${date}`;

const loadPlan = () => {
    // Ensure currentDate is set before loading
    if (!currentDate) {
        currentDate = storageService.get(STORAGE_KEYS.DAILY_PLAN_LAST_DATE) || new Date().toISOString().split('T')[0];
    }
    const savedPlan = storageService.get<DailyPlan>(getStorageKey(currentDate));
    if (savedPlan && savedPlan.tasks && savedPlan.tasks.length > 0) {
        dailyPlan = savedPlan;
        // Ensure reflection object exists for backward compatibility
        if (typeof dailyPlan.reflection === 'string' || !dailyPlan.reflection) {
            dailyPlan.reflection = { sleep: '', dayReview: '', bodyScan: '', mentalCheck: '', premeditation: '' };
        }
    } else {
        dailyPlan = JSON.parse(JSON.stringify(defaultPlan));
    }
};

const savePlan = () => {
    storageService.set(getStorageKey(currentDate), dailyPlan);
};


// --- UI RENDERING ---
const updateProgress = () => {
    if (!elements.progressRing || !elements.progressText) return;
    const totalTasks = dailyPlan.tasks.length;
    if (totalTasks === 0) {
        elements.progressRing.style.strokeDashoffset = '100';
        elements.progressText.textContent = '0%';
        return;
    }
    const completedTasks = dailyPlan.tasks.filter(task => task.completed).length;
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    
    elements.progressRing.style.strokeDashoffset = (100 - percentage).toString();
    elements.progressText.textContent = `${percentage}%`;
};

const renderSchedule = () => {
    if (!elements.scheduleList) return;
    elements.scheduleList.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        const hourSlot = document.createElement('li');
        hourSlot.className = 'hour-slot';
        hourSlot.dataset.hour = hour;
        
        const tasksInThisHour = dailyPlan.tasks
            .filter(task => task.startTime.startsWith(hour + ':'))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        let tasksHtml = '';
        tasksInThisHour.forEach(task => {
            tasksHtml += `
                <div class="task-block ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" data-category="${task.category}" tabindex="0">
                    <div class="task-content">
                        <div class="task-time-range">${task.startTime} - ${task.endTime}</div>
                        <p class="task-description">${DOMPurify.sanitize(task.description)}</p>
                    </div>
                    <div class="task-block-actions">
                        <button class="action-btn complete-btn complete" aria-label="Marcar como concluída"><i class="fas fa-check"></i></button>
                    </div>
                </div>
            `;
        });

        hourSlot.innerHTML = `
            <div class="hour-label">${hour}:00</div>
            <div class="tasks-in-hour">
                ${tasksHtml || ''}
            </div>
        `;
        elements.scheduleList.appendChild(hourSlot);
    }
    updateProgress();
};

const renderPage = () => {
    loadPlan();
    renderSchedule();
};

// --- MODAL HANDLING ---
export const openModal = (task?: ScheduledTask, prefill?: { description: string, category: TaskCategory }, hour?: string) => {
    if (!elements.modal || !elements.modalForm || !elements.modalTitle || !elements.modalDeleteBtn) return;
    elements.modalForm.reset();
    editingTaskId = task ? task.id : null;
    
    if (task) { // Editing existing task
        elements.modalTitle.textContent = 'Editar Evento';
        elements.modalDescriptionInput!.value = task.description;
        elements.modalStartTimeInput!.value = task.startTime;
        elements.modalEndTimeInput!.value = task.endTime;
        elements.modalCategorySelect!.value = task.category;
        elements.modalDeleteBtn.style.display = 'inline-flex';
    } else { // Adding new task
        elements.modalTitle.textContent = 'Adicionar Evento';
        elements.modalStartTimeInput!.value = hour ? `${hour.padStart(2, '0')}:00` : '';
        elements.modalEndTimeInput!.value = hour ? `${(parseInt(hour, 10) + 1).toString().padStart(2, '0')}:00` : '';
        elements.modalDeleteBtn.style.display = 'none';

        if (prefill) {
            elements.modalDescriptionInput!.value = prefill.description;
            elements.modalCategorySelect!.value = prefill.category;
        }
    }

    elements.modal.style.display = 'flex';
};

const closeModal = () => {
    if (elements.modal) elements.modal.style.display = 'none';
};

const handleSaveTask = (e: Event) => {
    e.preventDefault();
    
    const description = elements.modalDescriptionInput!.value.trim();
    if (!description) {
        window.showToast('A descrição é obrigatória.', 'warning');
        return;
    }

    const taskData: Omit<ScheduledTask, 'id' | 'completed'> = {
        description,
        startTime: elements.modalStartTimeInput!.value,
        endTime: elements.modalEndTimeInput!.value,
        category: elements.modalCategorySelect!.value as TaskCategory
    };
    
    if (editingTaskId) {
        const taskIndex = dailyPlan.tasks.findIndex(t => t.id === editingTaskId);
        if (taskIndex > -1) {
            dailyPlan.tasks[taskIndex] = { ...dailyPlan.tasks[taskIndex], ...taskData };
        }
    } else {
        dailyPlan.tasks.push({
            id: Date.now().toString(),
            completed: false,
            ...taskData,
        });
    }

    savePlan();
    renderSchedule();
    closeModal();
    window.showToast('Evento salvo no plano diário!', 'success');
};


const handleDeleteTask = async () => {
    if (!editingTaskId) return;
    const confirmed = await confirmAction('Tem certeza que deseja excluir este evento?');
    if (confirmed) {
        dailyPlan.tasks = dailyPlan.tasks.filter(t => t.id !== editingTaskId);
        savePlan();
        renderSchedule();
        closeModal();
        window.showToast('Evento excluído.', 'success');
    }
};

// --- EVENT HANDLERS ---
const handleDateChange = () => {
    if (!elements.dateInput) return;
    currentDate = elements.dateInput.value;
    storageService.set(STORAGE_KEYS.DAILY_PLAN_LAST_DATE, currentDate);
    renderPage();
};

const handleScheduleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    
    const taskBlock = target.closest<HTMLElement>('.task-block');
    const tasksInHour = target.closest<HTMLElement>('.tasks-in-hour');

    if (taskBlock) {
        const taskId = taskBlock.dataset.taskId;
        const task = dailyPlan.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (target.closest('.complete-btn')) {
            task.completed = !task.completed;
            savePlan();
            renderSchedule(); // Re-render to update class and progress
        } else {
            // Open modal to edit
            openModal(task);
        }
    } else if (tasksInHour) {
        const hour = tasksInHour.parentElement?.dataset.hour;
        openModal(undefined, undefined, hour);
    }
};

// --- LIFECYCLE FUNCTIONS ---
export function setup() {
    elements.pageContainer = document.getElementById('page-planejamento-diario');
    if (!elements.pageContainer) return;

    // Query elements
    elements.dateInput = elements.pageContainer.querySelector('#daily-plan-date');
    elements.progressRing = elements.pageContainer.querySelector('#daily-progress-ring .progress-ring-fg');
    elements.progressText = elements.pageContainer.querySelector('#progress-ring-text');
    elements.scheduleList = elements.pageContainer.querySelector('#schedule-hours-list');
    elements.addEventBtn = document.getElementById('add-event-btn') as HTMLButtonElement;
    
    // Modal elements are in the global scope (index.html), so we search the whole document
    elements.modal = document.getElementById('schedule-task-modal');
    if (elements.modal) {
        elements.modalTitle = elements.modal.querySelector('#schedule-task-modal-title');
        elements.modalForm = elements.modal.querySelector('#schedule-task-form');
        elements.modalCloseBtn = elements.modal.querySelector('#schedule-task-modal-close-btn');
        elements.modalCancelBtn = elements.modal.querySelector('#schedule-task-modal-cancel-btn');
        elements.modalSaveBtn = elements.modal.querySelector('#save-task-btn');
        elements.modalDeleteBtn = elements.modal.querySelector('#delete-task-btn');
        elements.modalDescriptionInput = elements.modal.querySelector('#task-description-input');
        elements.modalStartTimeInput = elements.modal.querySelector('#task-start-time-input');
        elements.modalEndTimeInput = elements.modal.querySelector('#task-end-time-input');
        elements.modalCategorySelect = elements.modal.querySelector('#task-category-select');
    }

    // Attach event listeners
    elements.dateInput?.addEventListener('change', handleDateChange);
    elements.addEventBtn?.addEventListener('click', () => openModal());
    elements.scheduleList?.addEventListener('click', handleScheduleClick);
    
    // Modal Listeners - IDEMPOTENT SETUP
    if (elements.modal && !elements.modal.dataset.handlerAttached) {
        elements.modalCloseBtn?.addEventListener('click', closeModal);
        elements.modalCancelBtn?.addEventListener('click', closeModal);
        elements.modalForm?.addEventListener('submit', handleSaveTask);
        elements.modalDeleteBtn?.addEventListener('click', handleDeleteTask);
    
        elements.modal.dataset.handlerAttached = 'true';
    }
}

export function show() {
    if (!elements.pageContainer || !elements.dateInput) {
        // If the page is not fully loaded, setup might not have run.
        // This can happen if user navigates away quickly.
        // It's safe to just return.
        return;
    };

    currentDate = storageService.get(STORAGE_KEYS.DAILY_PLAN_LAST_DATE) || new Date().toISOString().split('T')[0];
    elements.dateInput.value = currentDate;
    
    renderPage();

    // Scroll to current time
    setTimeout(() => {
        const currentHour = new Date().getHours();
        const currentHourSlot = elements.scheduleList?.querySelector(`[data-hour="${currentHour.toString().padStart(2, '0')}"]`);
        currentHourSlot?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}