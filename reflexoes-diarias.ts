// reflexoes-diarias.ts

import DOMPurify from 'dompurify';
import { storageService } from './storage';
import { STORAGE_KEYS } from './constants';
import { confirmAction, debounce } from './utils';

// --- TYPE DEFINITIONS ---
interface Reflection {
    id: string;
    category: 'Física' | 'Mental' | 'Financeira' | 'Familiar' | 'Profissional' | 'Social' | 'Espiritual';
    title: string;
    text: string;
    date: string; // YYYY-MM-DD
    timestamp: number;
}

interface ReflectionElements {
    page: HTMLElement;
    searchInput: HTMLInputElement;
    categoryFilter: HTMLSelectElement;
    dateFilter: HTMLSelectElement;
    sortFilter: HTMLSelectElement;
    listViewBtn: HTMLButtonElement;
    gridViewBtn: HTMLButtonElement;
    listContainer: HTMLElement;
    emptyState: HTMLElement;
}

// --- CONSTANTS ---
const categoryMap: { [key: string]: { name: string; color: string; } } = {
    'Física': { name: 'Física', color: 'var(--color-fisica)' },
    'Mental': { name: 'Mental', color: 'var(--color-mental)' },
    'Financeira': { name: 'Financeira', color: 'var(--color-financeira)' },
    'Familiar': { name: 'Familiar', color: 'var(--color-familiar)' },
    'Profissional': { name: 'Profissional', color: 'var(--color-profissional)' },
    'Social': { name: 'Social', color: 'var(--color-social)' },
    'Espiritual': { name: 'Espiritual', color: 'var(--color-espiritual)' },
};


// --- STATE ---
let allReflections: Reflection[] = [];
let filteredReflections: Reflection[] = [];
let elements: ReflectionElements;


// --- UTILITIES ---
function getElement<T extends HTMLElement>(selector: string, context: HTMLElement): T {
    const el = context.querySelector(selector);
    if (!el) throw new Error(`Element not found: ${selector}`);
    return el as T;
}

function formatReflectionDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}


// --- UI RENDERING ---
function renderReflections() {
    applyFilters();

    const fragment = document.createDocumentFragment();
    if (filteredReflections.length === 0) {
        elements.emptyState.style.display = 'block';
    } else {
        elements.emptyState.style.display = 'none';
        filteredReflections.forEach(reflection => {
            fragment.appendChild(createReflectionCardElement(reflection));
        });
    }
    elements.listContainer.replaceChildren(fragment);
}

function createReflectionCardElement(reflection: Reflection): HTMLElement {
    const categoryInfo = categoryMap[reflection.category] || { name: reflection.category, color: 'var(--color-secondary)' };
    const formattedDate = formatReflectionDate(reflection.timestamp);

    const card = document.createElement('div');
    card.className = 'reflection-card-item';
    card.style.borderLeftColor = categoryInfo.color;
    card.dataset.id = reflection.id;

    card.innerHTML = `
        <div class="reflection-card-header">
            <span class="reflection-card-category" style="background-color: ${categoryInfo.color};">${DOMPurify.sanitize(categoryInfo.name)}</span>
            <span class="reflection-card-date">${formattedDate}</span>
        </div>
        <div class="reflection-card-body">
            <strong class="reflection-title">${DOMPurify.sanitize(reflection.title)}</strong>
            <p>${DOMPurify.sanitize(reflection.text).replace(/\n/g, '<br>')}</p>
        </div>
        <div class="reflection-card-actions">
            <button class="action-btn delete-reflection-btn delete" aria-label="Excluir reflexão"><i class="fas fa-trash"></i></button>
        </div>
    `;
    return card;
}

function populateCategoryFilter() {
    elements.categoryFilter.innerHTML = '<option value="all">Todas</option>';
    Object.values(categoryMap).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        elements.categoryFilter.appendChild(option);
    });
}


// --- LOGIC ---
function loadReflections() {
    allReflections = storageService.get<Reflection[]>(STORAGE_KEYS.UNIFIED_REFLECTIONS) || [];
    // The initial sort is now handled by the filter function based on user selection
}

function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const category = elements.categoryFilter.value;
    const dateRange = elements.dateFilter.value;
    const sortOrder = elements.sortFilter.value;

    let result = [...allReflections];

    if (searchTerm) {
        result = result.filter(r =>
            r.text.toLowerCase().includes(searchTerm) ||
            r.title.toLowerCase().includes(searchTerm)
        );
    }

    if (category !== 'all') {
        result = result.filter(r => r.category === category);
    }

    if (dateRange !== 'all') {
        const now = new Date();
        now.setHours(23, 59, 59, 999); // End of today
        let startTime: number;

        switch (dateRange) {
            case 'today':
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                startTime = todayStart.getTime();
                break;
            case 'week':
                startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
                break;
            case 'month':
                startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
                break;
            default:
                startTime = 0;
        }
        result = result.filter(r => r.timestamp >= startTime);
    }

    result.sort((a, b) => sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

    filteredReflections = result;
}

async function handleDeleteReflection(e: Event) {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('.delete-reflection-btn');
    if (!deleteBtn) return;
    
    const card = deleteBtn.closest<HTMLElement>('.reflection-card-item');
    if (!card?.dataset.id) return;
    
    const reflectionId = card.dataset.id;
    
    const confirmed = await confirmAction('Tem certeza que deseja excluir esta reflexão? Esta ação não pode ser desfeita.');
    if (confirmed) {
        card.classList.add('fade-out');
        setTimeout(() => {
            allReflections = allReflections.filter(r => r.id !== reflectionId);
            storageService.set(STORAGE_KEYS.UNIFIED_REFLECTIONS, allReflections);
            window.showToast('Reflexão excluída com sucesso.', 'success');
            renderReflections();
        }, 300); // Wait for animation
    }
}

function switchView(view: 'list' | 'grid') {
    if (view === 'grid') {
        elements.listContainer.classList.add('grid-view');
        elements.gridViewBtn.classList.add('active');
        elements.listViewBtn.classList.remove('active');
        elements.gridViewBtn.setAttribute('aria-pressed', 'true');
        elements.listViewBtn.setAttribute('aria-pressed', 'false');
    } else {
        elements.listContainer.classList.remove('grid-view');
        elements.listViewBtn.classList.add('active');
        elements.gridViewBtn.classList.remove('active');
        elements.listViewBtn.setAttribute('aria-pressed', 'true');
        elements.gridViewBtn.setAttribute('aria-pressed', 'false');
    }
}


// --- LIFECYCLE FUNCTIONS ---
function initElements(page: HTMLElement) {
    elements = {
        page,
        searchInput: getElement<HTMLInputElement>('#reflexoes-search-input', page),
        categoryFilter: getElement<HTMLSelectElement>('#reflexoes-category-filter', page),
        dateFilter: getElement<HTMLSelectElement>('#reflexoes-date-filter', page),
        sortFilter: getElement<HTMLSelectElement>('#reflexoes-sort-filter', page),
        listViewBtn: getElement<HTMLButtonElement>('#list-view-btn', page),
        gridViewBtn: getElement<HTMLButtonElement>('#grid-view-btn', page),
        listContainer: getElement<HTMLElement>('#reflexoes-list-container', page),
        emptyState: getElement<HTMLElement>('#reflexoes-empty-state', page),
    };
}

export function setup() {
    const page = document.getElementById('page-reflexoes-diarias');
    if (!page) {
        console.warn('Página de reflexões não encontrada durante o setup.');
        return;
    }

    initElements(page);

    const debouncedRender = debounce(renderReflections, 300);

    elements.searchInput.addEventListener('input', debouncedRender);
    elements.categoryFilter.addEventListener('change', renderReflections);
    elements.dateFilter.addEventListener('change', renderReflections);
    elements.sortFilter.addEventListener('change', renderReflections);
    elements.listContainer.addEventListener('click', handleDeleteReflection);

    elements.listViewBtn.addEventListener('click', () => switchView('list'));
    elements.gridViewBtn.addEventListener('click', () => switchView('grid'));
    
    populateCategoryFilter();
}

export function show() {
    if (!elements || !elements.page) return; // Guard clause if setup failed
    loadReflections();
    renderReflections();
    switchView('list'); // Default to list view on show
}
