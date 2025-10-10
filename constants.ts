// constants.ts
// This file centralizes all magic strings, especially localStorage keys, for better maintainability.

export const CONFIG = {
    TOAST_DURATION: 5000,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_CACHE_SIZE: 15,
    DEBOUNCE_DELAY: 300,
    STORAGE_CACHE_SIZE: 50,
} as const;


export const STORAGE_KEYS = {
    // Page-specific goal lists
    FISICA_GOALS: 'fisicaGoals',
    MENTAL_GOALS: 'mentalGoals',
    FINANCE_GOALS: 'financeiraGoals',
    FAMILIAR_GOALS: 'familiarGoals',
    PROFISSIONAL_GOALS: 'profissionalGoals',
    SOCIAL_GOALS: 'socialGoals',
    ESPIRITUAL_GOALS: 'espiritualGoals',
    
    // Unified Reflections
    UNIFIED_REFLECTIONS: 'unifiedReflections',
    
    // Finance page specifics
    FINANCE_ASSETS: 'financeiraAssets',

    // Preventiva page specifics
    PREVENTIVA_PROFILE: 'preventivaProfile',
    PREVENTIVA_VACCINES: 'preventivaVaccineDates',
    PREVENTIVA_INDICATOR_PREFIX: 'preventiva-indicator-',
    PREVENTIVA_SUPPLEMENTS: 'preventivaSupplements',
    PREVENTIVA_DIAGNOSTICS: 'preventivaDiagnostics',

    // Global task list
    TASKS_DATA: 'tasksData',
    TASKS_CATEGORIES: 'tasksCategories',

    // Daily plan
    DAILY_PLAN_PREFIX: 'daily-plan-', // Used with date, e.g., 'daily-plan-2024-10-26'
    DAILY_PLAN_LAST_DATE: 'daily-plan-last-date',

    // User Contract
    USER_CONTRACT: 'userContractData',

    // App Settings
    TTS_SETTINGS: 'ttsReaderSettings',
    DAILY_MEDALS: 'dailyMedals',
    // Sidebar menu state (prefix)
    SIDEBAR_DETAILS_PREFIX: 'sidebar-details-', // e.g., 'sidebar-details-fisica'
} as const;