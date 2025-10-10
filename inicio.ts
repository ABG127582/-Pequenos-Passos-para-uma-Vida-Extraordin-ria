// inicio.ts
// This file contains the logic for the "Início" (Home) page.
import { storageService } from './storage';
import { STORAGE_KEYS } from './constants';

/**
 * Sets up event listeners for the home page.
 * The home page is currently composed of static cards (links),
 * so no specific JavaScript setup is needed at this time.
 * This function is included to maintain the application's modular pattern.
 */
export function setup(): void {
    const page = document.getElementById('page-inicio');
    if (!page) {
        // This might happen briefly during page transitions, so a console.warn is sufficient.
        console.warn("Home page container (#page-inicio) not found during setup.");
        return;
    }
    // No interactive elements requiring setup beyond standard anchor tags.
}

/**
 * This function is called by the router when the home page is shown.
 * It now checks for daily medals and displays them on the cards.
 */
export function show(): void {
    const page = document.getElementById('page-inicio');
    if (!page) return;

    // Hide all medals first to reset the state
    const allMedalIcons = page.querySelectorAll<HTMLElement>('.card-medal-icon');
    allMedalIcons.forEach(icon => icon.style.display = 'none');

    // Check for today's medals
    const today = new Date().toISOString().split('T')[0];
    const dailyMedals = storageService.get<{ [key: string]: string[] }>(STORAGE_KEYS.DAILY_MEDALS) || {};
    const medalsForToday = dailyMedals[today] || [];

    if (medalsForToday.length > 0) {
        medalsForToday.forEach(category => {
            const card = page.querySelector(`.saude-card.${category}`);
            if (card) {
                const medalIcon = card.querySelector<HTMLElement>('.card-medal-icon');
                if (medalIcon) {
                    medalIcon.style.display = 'block';
                }
            }
        });
    }

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }
}