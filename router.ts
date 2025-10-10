// router.ts
// This module handles all client-side routing and page content loading.

import DOMPurify from 'dompurify';
import { ttsReader } from './tts';
import { loadingManager } from './loadingManager';
import { errorHandler } from './errorHandler';
import { performanceMonitor } from './performance';
import { CONFIG } from './constants';

// --- Page Module Dynamic Imports for Lazy Loading ---
export const pageModuleImports: { [key: string]: () => Promise<any> } = {
    'inicio': () => import('./inicio'),
    'espiritual': () => import('./espiritual'),
    'preventiva': () => import('./preventiva'),
    'fisica': () => import('./fisica'),
    'mental': () => import('./mental'),
    'financeira': () => import('./financeira'),
    'familiar': () => import('./familiar'),
    'profissional': () => import('./profissional'),
    'social': () => import('./social'),
    'planejamento-diario': () => import('./planejamento-diario'),
    'tarefas': () => import('./tarefas'),
    'alongamento': () => import('./alongamento'),
    'sono': () => import('./sono'),
    'reflexoes-diarias': () => import('./reflexoes-diarias'),
    // Add other dynamically loaded pages here
};


// --- Page Hierarchy for Breadcrumbs and Active State ---
const pageHierarchy: { [key: string]: { parent: string | null; title: string } } = {
    'inicio': { parent: null, title: 'Início' },
    'fisica': { parent: 'inicio', title: 'Saúde Física' },
    'leitura-guia-fisica': { parent: 'fisica', title: 'Guia de Leitura' },
    'alongamento': { parent: 'fisica', title: 'Guia de Alongamento' },
    'alimentacao-forte': { parent: 'fisica', title: 'Guia de Alimentação Forte' },
    'mental': { parent: 'inicio', title: 'Saúde Mental' },
    'leitura-guia-mental': { parent: 'mental', title: 'Guia de Leitura' },
    'sono': { parent: 'mental', title: 'Qualidade do Sono' },
    'pdca-mental-autoregulacao': { parent: 'mental', title: 'Termômetro das Emoções' },
    'pdca-mental-resiliencia': { parent: 'mental', title: 'Desenvolvimento da Resiliência' },
    'pdca-mental-gestao-estresse-ansiedade': { parent: 'mental', title: 'Gestão do Estresse' },
    'pdca-mental-mindfulness': { parent: 'mental', title: 'Atenção Plena' },
    'pdca-mental-organizacao-tarefas': { parent: 'mental', title: 'Organização de Tarefas' },
    'pdca-mental-reducao-distracoes': { parent: 'mental', title: 'Redução de Distrações' },
    'pdca-mental-busca-proposito': { parent: 'mental', title: 'Busca por Propósito' },
    'pdca-mental-autocuidado': { parent: 'mental', title: 'Autocuidado' },
    'pdca-mental-granularidade': { parent: 'mental', title: 'Granularidade Emocional' },
    'pdca-mental-dicotomia': { parent: 'mental', title: 'Dicotomia do Controle' },
    'financeira': { parent: 'inicio', title: 'Saúde Financeira' },
    'leitura-guia-financeira': { parent: 'financeira', title: 'Guia de Leitura' },
    'familiar': { parent: 'inicio', title: 'Saúde Familiar' },
    'leitura-guia-familiar': { parent: 'familiar', title: 'Guia de Leitura' },
    'profissional': { parent: 'inicio', title: 'Saúde Profissional' },
    'social': { parent: 'inicio', title: 'Saúde Social' },
    'espiritual': { parent: 'inicio', title: 'Saúde Espiritual' },
    'leitura-guia-espiritual': { parent: 'espiritual', title: 'Guia de Leitura' },
    'preventiva': { parent: 'inicio', title: 'Saúde Preventiva' },
    'planejamento-diario': { parent: 'inicio', title: 'Planejamento Diário' },
    'tarefas': { parent: 'inicio', title: 'Lista de Tarefas' },
    'reflexoes-diarias': { parent: 'inicio', title: 'Reflexões Diárias' },
    'jejum-verde': { parent: 'fisica', title: 'Jejum Verde' },
    'food-gengibre': { parent: 'fisica', title: 'Gengibre' },
    'food-alho': { parent: 'fisica', title: 'Alho' },
    'food-brocolis': { parent: 'fisica', title: 'Brócolis' },
    'food-couveflor': { parent: 'fisica', title: 'Couve-flor' },
    'food-shitake': { parent: 'fisica', title: 'Shitake' },
    'food-lentilha': { parent: 'fisica', title: 'Lentilha' },
    'food-azeite': { parent: 'fisica', title: 'Azeite' },
    'food-morango': { parent: 'fisica', title: 'Morango' },
    'food-laranja': { parent: 'fisica', title: 'Laranja' },
    'food-maca': { parent: 'fisica', title: 'Maçã' },
    'food-cenoura': { parent: 'fisica', title: 'Cenoura' },
    'food-pimenta': { parent: 'fisica', title: 'Pimenta' },
    'food-ovo': { parent: 'fisica', title: 'Ovo' },
    'food-vinagremaca': { parent: 'fisica', title: 'Vinagre de Maçã' },
    'food-whey': { parent: 'fisica', title: 'Whey Protein' },
    'food-creatina': { parent: 'fisica', title: 'Creatina' },
    'food-curcuma': { parent: 'fisica', title: 'Cúrcuma' },
    'food-chaverde': { parent: 'fisica', title: 'Chá Verde' },
    'food-canela': { parent: 'fisica', title: 'Canela' },
    'food-linhaca': { parent: 'fisica', title: 'Linhaça' },
    'food-couve': { parent: 'fisica', title: 'Couve' },
    'food-rucula': { parent: 'fisica', title: 'Rúcula' },
    'food-agriao': { parent: 'fisica', title: 'Agrião' },
    'food-espinafre': { parent: 'fisica', title: 'Espinafre' },
    'food-folhasbeterraba': { parent: 'fisica', title: 'Folhas de Beterraba' },
    'food-almeirao': { parent: 'fisica', title: 'Almeirão' },
    'food-denteleao': { parent: 'fisica', title: 'Dente-de-Leão' },
};

// --- Intelligent Caching for Page HTML ---
interface CacheEntry {
    content: string;
    timestamp: number;
}
class PageCache {
    private cache = new Map<string, CacheEntry>();
    private readonly MAX_SIZE = CONFIG.MAX_CACHE_SIZE;
    private readonly TTL = CONFIG.CACHE_TTL;

    set(key: string, content: string) {
        if (this.cache.size >= this.MAX_SIZE) {
            this.evictOldest();
        }
        this.cache.set(key, { content, timestamp: Date.now() });
    }

    get(key: string): string | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.content;
    }

    private evictOldest() {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
}
const pageCache = new PageCache();

function updateBreadcrumbs(pageKey: string) {
    const nav = document.getElementById('breadcrumb-nav');
    if (!nav) return;

    if (pageKey === 'inicio' || !pageHierarchy[pageKey]) {
        nav.innerHTML = '';
        return;
    }

    const trail: { key: string; title: string }[] = [];
    let currentKey: string | null = pageKey;

    while (currentKey && pageHierarchy[currentKey]) {
        trail.unshift({ key: currentKey, title: pageHierarchy[currentKey].title });
        currentKey = pageHierarchy[currentKey].parent;
    }
    
    const ol = document.createElement('ol');
    trail.forEach((item, index) => {
        const li = document.createElement('li') as HTMLLIElement;
        if (index === trail.length - 1) {
            li.textContent = item.title;
            li.setAttribute('aria-current', 'page');
            li.className = 'breadcrumb-current';
        } else {
            const a = document.createElement('a') as HTMLAnchorElement;
            a.href = `#${item.key}`;
            a.dataset.page = item.key;
            a.textContent = item.title;
            li.appendChild(a);
        }
        ol.appendChild(li);
    });

    nav.innerHTML = '';
    nav.appendChild(ol);
}

function updateActiveNav(pageKey: string) {
    const navLinks = document.querySelectorAll('.sidebar-links a') as NodeListOf<HTMLElement>;
    const navSummaries = document.querySelectorAll('.sidebar-links summary') as NodeListOf<HTMLElement>;

    navLinks.forEach(link => link.classList.remove('active'));
    navSummaries.forEach(summary => summary.classList.remove('active'));

    const activeLink = document.querySelector(`.sidebar-links a[href="#${pageKey}"]`) as HTMLElement | null;
    if (activeLink) {
        activeLink.classList.add('active');
        const parentDetails = activeLink.closest('details');
        if (parentDetails) {
            const parentSummary = parentDetails.querySelector('summary') as HTMLElement | null;
            parentSummary?.classList.add('active');
            if (!parentDetails.open) {
                parentDetails.open = true;
            }
        }
    } else {
        const hierarchy = pageHierarchy[pageKey];
        if (hierarchy && hierarchy.parent) {
            const parentSummary = document.querySelector(`summary[data-page-parent="${hierarchy.parent}"]`) as HTMLElement | null;
            if (parentSummary) {
                parentSummary.classList.add('active');
                const parentDetails = parentSummary.closest('details');
                if (parentDetails && !parentDetails.open) {
                    parentDetails.open = true;
                }
            }
        }
    }
}


export function initRouter(pageModulesMap: typeof pageModuleImports, tts: typeof ttsReader) {
    const pageContentWrapper = document.getElementById('page-content-wrapper');
    const loadedJSModules: { [key: string]: any } = {};

    const router = async () => {
        const operationId = `router-nav-${Date.now()}`;
        loadingManager.start(operationId);
        tts.stop();
        const hash = window.location.hash.substring(1) || 'inicio';
    
        let pageToLoad = 'inicio';
        let anchorId: string | null = null;
        
        if (pageModulesMap[hash] || pageHierarchy[hash]) {
            // Check if it's a sub-page that should load a parent's module
            const hierarchyEntry = pageHierarchy[hash];
            if (hierarchyEntry && pageModulesMap[hierarchyEntry.parent as string] && !pageModulesMap[hash]) {
                pageToLoad = hierarchyEntry.parent as string;
                anchorId = hash;
            } else {
                pageToLoad = hash;
            }
        } else {
            console.warn(`Hash "${hash}" not found. Defaulting to inicio.`);
            pageToLoad = 'inicio';
        }
    
        const navKeyForStyle = pageToLoad.startsWith('food-') ? 'fisica' : pageToLoad;
        updateBreadcrumbs(hash);
        updateActiveNav(navKeyForStyle);
    
        if (!pageContentWrapper) {
            console.error('#page-content-wrapper not found!');
            loadingManager.stop(operationId);
            return;
        }
    
        pageContentWrapper.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
    
        const loadContent = async () => {
            let pageHtml = pageCache.get(pageToLoad);
            if (!pageHtml) {
                const response = await fetch(`${pageToLoad}.html`);
                if (!response.ok) throw new Error(`Page not found: ${pageToLoad}.html`);
                pageHtml = await response.text();
                pageCache.set(pageToLoad, pageHtml);
            }
            pageContentWrapper.innerHTML = DOMPurify.sanitize(pageHtml, { ADD_ATTR: ['target'] });

            const moduleKey = pageModulesMap[pageToLoad] ? pageToLoad : pageHierarchy[pageToLoad]?.parent;

            if (moduleKey && pageModulesMap[moduleKey]) {
                let pageModule = loadedJSModules[moduleKey];
                if (!pageModule) {
                    pageModule = await pageModulesMap[moduleKey]();
                    loadedJSModules[moduleKey] = pageModule;
                    // FIX: Call setup only once when the module is first loaded.
                    if (pageModule.setup) {
                        performanceMonitor.measure(`${moduleKey}::setup`, pageModule.setup);
                    }
                }
                
                // The 'show' function should be called every time the page is displayed.
                if (pageModule.show) {
                    performanceMonitor.measure(`${moduleKey}::show`, pageModule.show);
                }
            }
        };

        try {
            await performanceMonitor.measureAsync(`loadPage::${pageToLoad}`, () => 
                errorHandler.wrap(loadContent, 'router.loadContent')
            );
        } catch (error) {
            // Error is already handled by errorHandler, just update UI
            pageContentWrapper.innerHTML = `<div class="content-section" style="text-align: center;"><h2>Página não encontrada</h2><p>Ocorreu um erro ao carregar o conteúdo.</p></div>`;
            updateBreadcrumbs('inicio');
            updateActiveNav('inicio');
        } finally {
            if (anchorId) {
                const element = document.getElementById(anchorId);
                element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                pageContentWrapper.scrollTo(0, 0);
            }
            loadingManager.stop(operationId);
        }
    };

    window.addEventListener('hashchange', router);
    window.addEventListener('popstate', router);
    router(); // Initial load
}