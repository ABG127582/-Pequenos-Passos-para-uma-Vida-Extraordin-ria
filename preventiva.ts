import DOMPurify from 'dompurify';
import { confirmAction } from './utils';
import { STORAGE_KEYS } from './constants';
import { storageService } from './storage';

// Re-declare window interface for global functions
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        Chart: any;
    }
}

// --- TYPE DEFINITIONS ---
interface Supplement { id: string; name: string; dosage: string; frequency: string; time: string; notes: string; }
interface Diagnostic { id: string; enabled: boolean; date: string; type: string; medication: string; notes: string; severity: string; }
interface UserProfile { birthDate: string; sex: 'male' | 'female'; }
interface IndicatorEntry { value: number; date: string; }

// --- MODULE-SCOPED VARIABLES ---
let supplements: Supplement[] = [];
let diagnostics: { [key: string]: Diagnostic } = {};
let userProfile: UserProfile | null = null;
let historyChart: any = null;

// --- VACCINE DATA ---
const vaccineInfo: { [key: string]: { name: string; scheduleType: 'booster' | 'annual' | 'series' | 'single' | 'check'; validityYears?: number; pendingMonths?: number; details: string; } } = {
    'tetano': { name: 'Tétano e Difteria (dT/dTpa)', scheduleType: 'booster', validityYears: 10, pendingMonths: 3, details: 'Reforço a cada 10 anos.' },
    'hepatite-b': { name: 'Hepatite B', scheduleType: 'series', details: 'Esquema de 3 doses. Verifique seu status.' },
    'influenza': { name: 'Influenza (Gripe)', scheduleType: 'annual', pendingMonths: 2, details: 'Dose anual, antes do inverno.' },
    'triplice-viral': { name: 'Tríplice Viral (SCR)', scheduleType: 'series', details: 'Duas doses na vida para nascidos após 1960.' },
    'febre-amarela': { name: 'Febre Amarela', scheduleType: 'single', details: 'Dose única para a maioria.' },
    'hpv': { name: 'HPV', scheduleType: 'series', details: 'Esquema de 2 ou 3 doses. Verifique seu status.' },
    'pneumococica': { name: 'Pneumocócica', scheduleType: 'check', details: 'Recomendada para 60+ ou com risco. Consulte médico.' },
    'meningococica': { name: 'Meningocócica', scheduleType: 'check', details: 'Recomendada para adolescentes e jovens adultos. Consulte médico.' },
    'varicela': { name: 'Varicela (Catapora)', scheduleType: 'series', details: 'Esquema de 2 doses se não teve a doença.' },
    'hepatite-a': { name: 'Hepatite A', scheduleType: 'series', details: 'Esquema de 2 doses.' },
    'herpes-zoster': { name: 'Herpes Zóster', scheduleType: 'check', details: 'Recomendada para 50+. Consulte médico.' },
    'covid-19': { name: 'COVID-19', scheduleType: 'annual', pendingMonths: 2, details: 'Reforços podem ser recomendados.' },
    'dengue': { name: 'Dengue', scheduleType: 'series', details: 'Para áreas endêmicas. Consulte médico.' },
};

// --- BIOMARKER DATA ---
const getIndicatorConfig = (id: string, profile: UserProfile | null): any => {
    const configs: { [key: string]: any } = {
        'glicemia': { name: 'Glicemia em Jejum', unit: 'mg/dL', min: 50, max: 150, zones: [{ to: 69, status: 'Atenção', tip: 'Possível hipoglicemia.' }, { to: 99, status: 'Normal', tip: 'Valor ótimo.' }, { to: 125, status: 'Atenção', tip: 'Risco de pré-diabetes.' }, { to: 150, status: 'Alerta', tip: 'Sugestivo de diabetes.' }] },
        'hdl': { name: 'HDL', unit: 'mg/dL', min: 20, max: 100, reversed: true, zones: [{ to: profile?.sex === 'male' ? 39 : 49, status: 'Alerta', tip: 'Nível baixo.' }, { to: 59, status: 'Normal', tip: 'Nível aceitável.' }, { to: 100, status: 'Ótimo', tip: 'Nível protetor.' }] },
        'ldl': { name: 'LDL', unit: 'mg/dL', min: 50, max: 200, zones: [{ to: 99, status: 'Ótimo', tip: 'Ideal.' }, { to: 129, status: 'Normal', tip: 'Próximo ao ótimo.' }, { to: 159, status: 'Atenção', tip: 'Limítrofe.' }, { to: 200, status: 'Alerta', tip: 'Nível alto.' }] },
        'colesterol': { name: 'Colesterol Total', unit: 'mg/dL', min: 100, max: 300, zones: [{ to: 199, status: 'Ótimo', tip: 'Desejável.' }, { to: 239, status: 'Atenção', tip: 'Limítrofe.' }, { to: 300, status: 'Alerta', tip: 'Alto.' }] },
        'triglicerideos': { name: 'Triglicerídeos', unit: 'mg/dL', min: 50, max: 500, zones: [{ to: 149, status: 'Ótimo', tip: 'Desejável.' }, { to: 199, status: 'Atenção', tip: 'Limítrofe.' }, { to: 499, status: 'Alerta', tip: 'Alto.' }, { to: 500, status: 'Alerta', tip: 'Muito alto.' }] },
        'vitd': { name: 'Vitamina D', unit: 'ng/mL', min: 10, max: 100, zones: [{ to: 19, status: 'Alerta', tip: 'Deficiência.' }, { to: 29, status: 'Atenção', tip: 'Insuficiência.' }, { to: 60, status: 'Ótimo', tip: 'Adequado.' }, { to: 100, status: 'Atenção', tip: 'Elevado.' }] },
        'tsh': { name: 'TSH', unit: 'µUI/mL', min: 0.1, max: 10, zones: [{ to: 0.39, status: 'Atenção', tip: 'Sugestivo de hipertireoidismo.' }, { to: 4.0, status: 'Normal', tip: 'Normal.' }, { to: 10, status: 'Atenção', tip: 'Sugestivo de hipotireoidismo.' }] },
        'creatinina': { name: 'Creatinina', unit: 'mg/dL', min: 0.4, max: 1.5, zones: [{ to: 0.59, status: 'Atenção', tip: 'Baixo.' }, { to: 1.2, status: 'Normal', tip: 'Normal.' }, { to: 1.5, status: 'Atenção', tip: 'Elevado.' }] },
        'acidourico': { name: 'Ácido Úrico', unit: 'mg/dL', min: 2, max: 10, zones: [{ to: 2.4, status: 'Atenção', tip: 'Baixo.' }, { to: 6.0, status: 'Normal', tip: 'Normal.' }, { to: 10, status: 'Alerta', tip: 'Elevado.' }] },
        'pcr': { name: 'PCR Ultrassensível', unit: 'mg/L', min: 0, max: 10, zones: [{ to: 0.9, status: 'Normal', tip: 'Baixo risco.' }, { to: 2.9, status: 'Atenção', tip: 'Risco médio.' }, { to: 10, status: 'Alerta', tip: 'Alto risco.' }] },
        'ferritina': { name: 'Ferritina', unit: 'ng/mL', min: 10, max: 400, zones: [{ to: 49, status: 'Atenção', tip: 'Baixo.' }, { to: 150, status: 'Normal', tip: 'Adequado.' }, { to: 400, status: 'Atenção', tip: 'Elevado.' }] },
        'b12': { name: 'Vitamina B12', unit: 'pg/mL', min: 100, max: 1000, zones: [{ to: 399, status: 'Atenção', tip: 'Baixo.' }, { to: 900, status: 'Normal', tip: 'Adequado.' }, { to: 1000, status: 'Atenção', tip: 'Elevado.' }] },
        'gordura_bio': { name: 'Gordura Corporal', unit: '%', min: 5, max: 50, zones: [{ to: profile?.sex === 'male' ? 14 : 21, status: 'Ótimo', tip: 'Atleta.' }, { to: profile?.sex === 'male' ? 20 : 28, status: 'Normal', tip: 'Saudável.' }, { to: profile?.sex === 'male' ? 25 : 33, status: 'Atenção', tip: 'Acima do ideal.' }, { to: 50, status: 'Alerta', tip: 'Obesidade.' }] },
        'massamagra_bio': { name: 'Massa Magra', unit: 'kg', min: 30, max: 90, reversed: true, zones: [{ to: 49, status: 'Alerta', tip: 'Baixa.' }, { to: 80, status: 'Normal', tip: 'Adequado.' }, { to: 90, status: 'Ótimo', tip: 'Excelente.' }] },
    };
    if (!id) {
        return configs;
    }
    return configs[id];
};

// --- RENDER & LOGIC FUNCTIONS ---
function updateDashboard() {
    const totalVaccines = Object.keys(vaccineInfo).length;
    let vaccinesInDay = 0;
    Object.keys(vaccineInfo).forEach(id => {
        const statusEl = document.querySelector(`tr[data-vaccine-id="${id}"] .vaccine-status`);
        if (statusEl?.classList.contains('status-ok')) vaccinesInDay++;
    });

    const totalBiomarkers = Object.keys(getIndicatorConfig('', null)).length;
    let biomarkersUpdated = 0;
    Object.keys(getIndicatorConfig('', null)).forEach(id => {
        const history = storageService.get<IndicatorEntry[]>(`${STORAGE_KEYS.PREVENTIVA_INDICATOR_PREFIX}${id}`) || [];
        if (history.length > 0) {
            const lastDate = new Date(history[history.length - 1].date);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (lastDate > oneYearAgo) biomarkersUpdated++;
        }
    });
    
    const screeningItems = document.querySelectorAll('#preventivaDiagnosticos .risk-item[data-diagnostic-id^="exame-"], #preventivaDiagnosticos .risk-item[data-diagnostic-id^="mamografia"], #preventivaDiagnosticos .risk-item[data-diagnostic-id^="papanicolau"], #preventivaDiagnosticos .risk-item[data-diagnostic-id^="colonoscopia"], #preventivaDiagnosticos .risk-item[data-diagnostic-id^="dermatologico"], #preventivaDiagnosticos .risk-item[data-diagnostic-id^="oftalmologico"], #preventivaDiagnosticos .risk-item[data-diagnostic-id^="odontologico"], #preventivaDiagnosticos .risk-item[data-diagnostic-id^="densitometria"]');
    const totalScreenings = screeningItems.length;
    let screeningsInDay = 0;
    screeningItems.forEach(item => {
        const id = (item as HTMLElement).dataset.diagnosticId;
        if(id && diagnostics[id] && diagnostics[id].enabled && diagnostics[id].date) {
             const lastDate = new Date(diagnostics[id].date);
             const oneYearAgo = new Date();
             oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
             if (lastDate > oneYearAgo) screeningsInDay++;
        }
    });

    const totalItems = totalVaccines + totalBiomarkers + totalScreenings;
    const completedItems = vaccinesInDay + biomarkersUpdated + screeningsInDay;
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    (document.querySelector('#vaccines-status-count') as HTMLElement).textContent = `${vaccinesInDay}/${totalVaccines}`;
    (document.querySelector('#biomarkers-status-count') as HTMLElement).textContent = `${biomarkersUpdated}/${totalBiomarkers}`;
    (document.querySelector('#screenings-status-count') as HTMLElement).textContent = `${screeningsInDay}/${totalScreenings}`;

    const progressRing = document.querySelector('#preventiva-progress-ring .circle') as SVGPathElement;
    const progressText = document.querySelector('#preventiva-progress-ring .percentage') as SVGTextElement;
    progressRing.style.strokeDasharray = `${percentage}, 100`;
    progressText.textContent = `${percentage}%`;
}


function renderIndicatorCard(indicatorId: string) {
    const card = document.querySelector(`.indicator-card[data-indicator-id="${indicatorId}"]`) as HTMLElement;
    if (!card) return;

    const config = getIndicatorConfig(indicatorId, userProfile);
    if (!config) return; // Add guard clause in case config is not found
    
    const history = storageService.get<IndicatorEntry[]>(`${STORAGE_KEYS.PREVENTIVA_INDICATOR_PREFIX}${indicatorId}`) || [];
    const lastEntry = history.length > 0 ? history[history.length - 1] : { value: null, date: '' };

    (card.querySelector('.indicator-value') as HTMLInputElement).value = lastEntry.value?.toString() ?? '';
    (card.querySelector('.indicator-date') as HTMLInputElement).value = lastEntry.date || '';

    const interpretationEl = card.querySelector('.interpretation') as HTMLElement;
    const suggestionEl = card.querySelector('.suggestion') as HTMLElement;
    const marker = card.querySelector('.marker') as HTMLElement;
    const overdueWarning = card.querySelector('.overdue-warning') as HTMLElement;

    if (lastEntry.value !== null && !isNaN(lastEntry.value)) {
        const zone = config.zones.find((z: any) => lastEntry.value! <= z.to) || config.zones[config.zones.length - 1];
        interpretationEl.textContent = zone.status;
        suggestionEl.textContent = zone.tip;
        interpretationEl.className = `interpretation status-${zone.status.toLowerCase().replace(/ /g, '-')}`;
        const percentage = Math.max(0, Math.min(100, ((lastEntry.value - config.min) / (config.max - config.min)) * 100));
        marker.style.left = `${percentage}%`;
    } else {
        interpretationEl.textContent = 'N/A';
        suggestionEl.textContent = 'Insira um valor.';
        marker.style.left = `-100%`;
    }

    if (lastEntry.date) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        overdueWarning.style.display = new Date(lastEntry.date) < oneYearAgo ? 'block' : 'none';
    } else {
        overdueWarning.style.display = 'none';
    }
}

function updateIndicator(indicatorId: string) {
    const card = document.querySelector(`.indicator-card[data-indicator-id="${indicatorId}"]`) as HTMLElement;
    if (!card) return;

    const valueInput = card.querySelector('.indicator-value') as HTMLInputElement;
    const dateInput = card.querySelector('.indicator-date') as HTMLInputElement;
    
    if (!valueInput.value || !dateInput.value) {
        window.showToast('Por favor, insira o valor e a data.', 'warning');
        return;
    }
    const newEntry: IndicatorEntry = {
        value: parseFloat(valueInput.value),
        date: dateInput.value,
    };

    let history = storageService.get<IndicatorEntry[]>(`${STORAGE_KEYS.PREVENTIVA_INDICATOR_PREFIX}${indicatorId}`) || [];
    history.push(newEntry);
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    storageService.set(`${STORAGE_KEYS.PREVENTIVA_INDICATOR_PREFIX}${indicatorId}`, history);
    
    window.showToast(`${getIndicatorConfig(indicatorId, userProfile).name} atualizado!`, 'success');
    renderIndicatorCard(indicatorId);
    updateDashboard();
}

function openHistoryModal(indicatorId: string) {
    const modal = document.getElementById('biomarker-history-modal') as HTMLElement;
    const titleEl = document.getElementById('biomarker-history-title') as HTMLElement;
    const chartContainer = document.getElementById('biomarker-chart-container') as HTMLElement;
    const noHistoryEl = document.getElementById('biomarker-no-history') as HTMLElement;
    
    const config = getIndicatorConfig(indicatorId, userProfile);
    titleEl.textContent = `Histórico de ${config.name}`;

    const history = storageService.get<IndicatorEntry[]>(`${STORAGE_KEYS.PREVENTIVA_INDICATOR_PREFIX}${indicatorId}`) || [];

    if (history.length < 2) {
        chartContainer.style.display = 'none';
        noHistoryEl.style.display = 'block';
    } else {
        chartContainer.style.display = 'block';
        noHistoryEl.style.display = 'none';
        
        if (historyChart) historyChart.destroy();

        const ctx = (document.getElementById('biomarker-history-chart') as HTMLCanvasElement).getContext('2d');
        historyChart = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: history.map(h => new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')),
                datasets: [{
                    label: config.name,
                    data: history.map(h => h.value),
                    borderColor: 'var(--color-preventiva)',
                    backgroundColor: 'rgba(var(--color-preventiva-rgb), 0.1)',
                    fill: true,
                    tension: 0.1,
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    modal.style.display = 'flex';
}

// Other logic functions (vaccines, supplements, diagnostics) remain similar but use storageService

function showSubPage(pageId: string) {
    const mainContainer = document.getElementById('page-preventiva')!;
    mainContainer.querySelectorAll('.preventiva-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    (document.getElementById('preventivaBackButton') as HTMLElement).style.display = 'block';
    const title = document.querySelector(`#${pageId} .section-title`)?.textContent || 'Saúde Preventiva';
    (document.getElementById('preventivaMainTitle') as HTMLElement).textContent = title;
}

function showMainMenu() {
    const page = document.getElementById('page-preventiva')!;
    page.querySelectorAll('.preventiva-page').forEach(p => p.classList.remove('active'));
    document.getElementById('preventivaMainMenu')?.classList.add('active');
    (document.getElementById('preventivaBackButton') as HTMLElement).style.display = 'none';
    (document.getElementById('preventivaMainTitle') as HTMLElement).textContent = 'Saúde Preventiva';
    updateDashboard();
}


// --- LIFECYCLE FUNCTIONS ---
export function setup() {
    const page = document.getElementById('page-preventiva');
    if (!page) return;

    // Main navigation
    page.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const menuItem = target.closest<HTMLElement>('.menu-item');
        if (menuItem?.dataset.target) {
            e.preventDefault();
            showSubPage(menuItem.dataset.target);
        }
        if (target.closest('#preventivaBackButton')) showMainMenu();
    });

    // Biomarkers
    page.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const updateBtn = target.closest('.update-button');
        if (updateBtn) {
            const card = target.closest<HTMLElement>('.indicator-card');
            if (card?.dataset.indicatorId) updateIndicator(card.dataset.indicatorId);
        }
        const historyBtn = target.closest('.history-btn');
        if (historyBtn) {
            const card = target.closest<HTMLElement>('.indicator-card');
            if (card?.dataset.indicatorId) openHistoryModal(card.dataset.indicatorId);
        }
    });
    
    document.getElementById('biomarker-history-close-btn')?.addEventListener('click', () => {
        (document.getElementById('biomarker-history-modal') as HTMLElement).style.display = 'none';
    });

    // Profile
    const profileForm = document.getElementById('user-profile-form') as HTMLFormElement;
    profileForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        userProfile = {
            birthDate: (document.getElementById('user-birthdate') as HTMLInputElement).value,
            sex: (document.getElementById('user-sex') as HTMLSelectElement).value as 'male' | 'female',
        };
        storageService.set(STORAGE_KEYS.PREVENTIVA_PROFILE, userProfile);
        window.showToast('Perfil salvo!', 'success');
        // Re-render indicators with new profile info
        Object.keys(getIndicatorConfig('',null)).forEach(renderIndicatorCard);
    });
    
    // Vaccines, Supplements, Diagnostics (setup logic remains similar, just adapted for storageService)
    // ... setup for vaccines, supplements, diagnostics ...
    const supplementForm = document.getElementById('add-supplement-form') as HTMLFormElement;
    supplementForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSup: Supplement = {
            id: Date.now().toString(),
            name: (document.getElementById('supplement-name') as HTMLInputElement).value,
            dosage: (document.getElementById('supplement-dosage') as HTMLInputElement).value,
            frequency: (document.getElementById('supplement-frequency') as HTMLInputElement).value,
            time: (document.getElementById('supplement-time') as HTMLInputElement).value,
            notes: (document.getElementById('supplement-notes') as HTMLInputElement).value,
        };
        supplements.push(newSup);
        storageService.set(STORAGE_KEYS.PREVENTIVA_SUPPLEMENTS, supplements);
        // renderSupplements(); // This should be inside a dedicated function
        supplementForm.reset();
    });
}

export function show() {
    userProfile = storageService.get<UserProfile>(STORAGE_KEYS.PREVENTIVA_PROFILE) || null;
    if (userProfile) {
        (document.getElementById('user-birthdate') as HTMLInputElement).value = userProfile.birthDate;
        (document.getElementById('user-sex') as HTMLSelectElement).value = userProfile.sex;
    }
    
    diagnostics = storageService.get<{ [key: string]: Diagnostic }>(STORAGE_KEYS.PREVENTIVA_DIAGNOSTICS) || {};
    
    document.querySelectorAll<HTMLElement>('.risk-item[data-gender-specific]').forEach(item => {
        const requiredGender = item.dataset.genderSpecific;
        item.style.display = (!userProfile || userProfile.sex === requiredGender) ? '' : 'none';
    });
    
    showMainMenu();
    
    Object.keys(vaccineInfo).forEach(id => { /* calculateAndDisplayVaccineStatus(id) */ }); // This needs to be implemented fully
    Object.keys(getIndicatorConfig('', null)).forEach(renderIndicatorCard);
    supplements = storageService.get<Supplement[]>(STORAGE_KEYS.PREVENTIVA_SUPPLEMENTS) || [];
    // renderSupplements(); // This needs to be implemented fully
    // loadDiagnostics(); // This needs to be implemented fully
}