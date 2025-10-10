// tts.ts
// This module contains all logic for the Text-to-Speech (TTS) reader feature.

import DOMPurify from 'dompurify';
import { storageService } from './storage';
import { showToast, trapFocus } from './utils';
import { STORAGE_KEYS } from './constants';

// FIX: Define an interface for TTS settings to ensure type safety when loading from storage.
interface TTSSettings {
    voiceURI: string | null;
    rate: number;
    pitch: number;
}

export const ttsReader = {
    isSelectionMode: false,
    isSpeaking: false,
    elements: [] as HTMLElement[],
    currentIndex: 0,
    highlightedElement: null as HTMLElement | null,
    highlightedWord: null as HTMLElement | null,
    originalElementContent: null as string | null,
    keepAliveInterval: undefined as number | undefined,
    ptBrVoice: null as SpeechSynthesisVoice | null,
    textToSpeak: null as string | null,
    speakingSessionId: null as number | null,
    settingsModal: null as HTMLElement | null,
    mainContentListener: null as ((e: MouseEvent) => void) | null,
    removeFocusTrap: null as (() => void) | null,
    lastFocusedElement: null as HTMLElement | null,
    
    // User-configurable settings
    voiceURI: null as string | null,
    rate: 1.2,
    pitch: 1.0,
    
    openSettings() {
        if(this.settingsModal) {
            this.lastFocusedElement = document.activeElement as HTMLElement;
            this.settingsModal.style.display = 'flex';
            (this.settingsModal.querySelector('select, input, button') as HTMLElement)?.focus();
            this.removeFocusTrap = trapFocus(this.settingsModal);
        }
    },

    closeSettings() {
        if(this.settingsModal) {
            this.settingsModal.style.display = 'none';
            if (this.removeFocusTrap) {
                this.removeFocusTrap();
                this.removeFocusTrap = null;
            }
            this.lastFocusedElement?.focus();
        }
    },

    init() {
        this.settingsModal = document.getElementById('tts-settings-modal');
        this.loadSettings();

        const findVoiceAndPopulateDropdown = () => {
            const voices = speechSynthesis.getVoices();
            let ptBrVoices = voices.filter(v => v.lang === 'pt-BR' && !/Daniel|Maria/i.test(v.name));

            const voiceSelect = document.getElementById('tts-voice-select') as HTMLSelectElement;
            if (!voiceSelect) return;
            voiceSelect.innerHTML = '';

            if (ptBrVoices.length === 0) {
                voiceSelect.innerHTML = '<option value="">Nenhuma voz em Português encontrada</option>';
                this.ptBrVoice = null;
                return;
            }

            ptBrVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voiceURI;
                option.textContent = `${voice.name} (${voice.lang.replace('-', '_')})`;
                if (voice.localService) option.textContent += ' - Local';
                voiceSelect.appendChild(option);
            });
            
            const thalitaVoice = ptBrVoices.find(v => /Thalita/i.test(v.name));
            
            const sortedVoices = [...ptBrVoices].sort((a, b) => {
                let scoreA = 0, scoreB = 0;
                if (a.name.includes('Google')) scoreA += 10;
                if (b.name.includes('Google')) scoreB += 10;
                if (!a.localService) scoreA += 5;
                if (!b.localService) scoreB += 5;
                if (a.default) scoreA += 1;
                if (b.default) scoreB += 1;
                return scoreB - scoreA;
            });

            const bestFallbackVoice = sortedVoices[0] || null;
            const savedVoiceURI = this.voiceURI;
            
            const preselectedVoice = ptBrVoices.find(v => v.voiceURI === savedVoiceURI) || thalitaVoice || bestFallbackVoice;

            if (preselectedVoice) {
                this.ptBrVoice = preselectedVoice;
                this.voiceURI = preselectedVoice.voiceURI;
                voiceSelect.value = preselectedVoice.voiceURI;
            } else {
                 this.ptBrVoice = null;
            }
        };

        findVoiceAndPopulateDropdown();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = findVoiceAndPopulateDropdown;
        }

        const playBtn = document.getElementById('tts-play-btn');
        const stopBtn = document.getElementById('tts-stop-btn');
        playBtn?.addEventListener('click', () => this.openSettings());
        stopBtn?.addEventListener('click', () => this.stop());
        
        const settingsCloseBtn = document.getElementById('tts-settings-close-btn');
        const startReadingBtn = document.getElementById('tts-start-reading-btn');
        const voiceSelect = document.getElementById('tts-voice-select') as HTMLSelectElement;
        const rateSlider = document.getElementById('tts-rate-slider') as HTMLInputElement;
        const rateValue = document.getElementById('tts-rate-value') as HTMLSpanElement;
        const pitchSlider = document.getElementById('tts-pitch-slider') as HTMLInputElement;
        const pitchValue = document.getElementById('tts-pitch-value') as HTMLSpanElement;
        const testBtn = document.getElementById('tts-settings-test-btn');

        settingsCloseBtn?.addEventListener('click', () => this.closeSettings());
        startReadingBtn?.addEventListener('click', () => {
            this.closeSettings();
            this.activateSelectionMode();
        });

        voiceSelect?.addEventListener('change', () => {
            this.voiceURI = voiceSelect.value;
            this.ptBrVoice = speechSynthesis.getVoices().find(v => v.voiceURI === this.voiceURI) || this.ptBrVoice;
            this.saveSettings();
        });

        rateSlider?.addEventListener('input', () => {
            this.rate = parseFloat(rateSlider.value);
            if (rateValue) rateValue.textContent = this.rate.toFixed(1);
            this.saveSettings();
        });

        pitchSlider?.addEventListener('input', () => {
            this.pitch = parseFloat(pitchSlider.value);
            if (pitchValue) pitchValue.textContent = this.pitch.toFixed(1);
            this.saveSettings();
        });

        testBtn?.addEventListener('click', () => this.testVoice());
    },

    loadSettings() {
        // FIX: Provide a type to storageService.get to avoid 'unknown' type.
        const saved = storageService.get<TTSSettings>(STORAGE_KEYS.TTS_SETTINGS);
        if (saved) {
            // FIX: Use nullish coalescing operator (??) to correctly handle falsy values like 0 for rate/pitch.
            this.voiceURI = saved.voiceURI ?? null;
            this.rate = saved.rate ?? 1.2;
            this.pitch = saved.pitch ?? 1.0;
        }
        
        const rateSlider = document.getElementById('tts-rate-slider') as HTMLInputElement;
        const rateValue = document.getElementById('tts-rate-value') as HTMLSpanElement;
        const pitchSlider = document.getElementById('tts-pitch-slider') as HTMLInputElement;
        const pitchValue = document.getElementById('tts-pitch-value') as HTMLSpanElement;

        if (rateSlider) rateSlider.value = String(this.rate);
        if (rateValue) rateValue.textContent = this.rate.toFixed(1);
        if (pitchSlider) pitchSlider.value = String(this.pitch);
        if (pitchValue) pitchValue.textContent = this.pitch.toFixed(1);
    },

    saveSettings() {
        storageService.set(STORAGE_KEYS.TTS_SETTINGS, {
            voiceURI: this.voiceURI,
            rate: this.rate,
            pitch: this.pitch,
        });
    },
    
    testVoice() {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Olá, esta é uma amostra da voz e das configurações selecionadas.");
        utterance.lang = 'pt-BR';
        if (this.ptBrVoice) utterance.voice = this.ptBrVoice;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        speechSynthesis.speak(utterance);
    },

    activateSelectionMode() {
        if (this.isSpeaking) return;
        this.isSelectionMode = true;
        document.body.classList.add('tts-selection-mode');
        showToast("Clique em um parágrafo para começar a leitura.", 'info');

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        this.mainContentListener = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const interactiveSelector = 'a, button, input, select, textarea, summary, [data-page], [data-page-parent]';
            
            if (target.closest(interactiveSelector)) {
                this.deactivateSelectionMode();
                return;
            }

            const readableTarget = target.closest('p, h1, h2, h3, h4, h5, h6, li, .stretch-card h5, .stretch-card p');

            if (readableTarget) {
                e.preventDefault();
                e.stopPropagation();
                this.startReadingFromElement(readableTarget as HTMLElement);
            } else {
                this.deactivateSelectionMode();
            }
        };
        
        mainContent.addEventListener('click', this.mainContentListener, true);
    },

    deactivateSelectionMode() {
        if (!this.isSelectionMode) return;
        this.isSelectionMode = false;
        document.body.classList.remove('tts-selection-mode');
        
        const mainContent = document.getElementById('main-content');
        if (mainContent && this.mainContentListener) {
            mainContent.removeEventListener('click', this.mainContentListener, true);
            this.mainContentListener = null;
        }
    },
    
    startReadingFromElement(readableTarget: HTMLElement) {
        if (this.isSelectionMode) {
            this.deactivateSelectionMode();
        }
        
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const selection = window.getSelection();
        let textToStartWith = readableTarget.innerText.trim();

        if (selection && selection.rangeCount > 0 && selection.toString().length > 1) {
             const range = selection.getRangeAt(0);
             if (readableTarget.contains(range.commonAncestorContainer)) {
                const fullText = readableTarget.innerText;
                const selectedText = selection.toString();
                const startIndex = fullText.indexOf(selectedText);
                if(startIndex !== -1) {
                    textToStartWith = fullText.substring(startIndex).trim();
                }
             }
        }
        
        this.textToSpeak = textToStartWith;
        
        this.elements = Array.from(mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, .stretch-card h5, .stretch-card p'));
        const clickedIndex = this.elements.indexOf(readableTarget);
        if (clickedIndex !== -1) {
            this.start(clickedIndex);
        }
    },

    start(startIndex: number) {
        if (this.isSpeaking) {
            speechSynthesis.cancel();
        }

        this.isSpeaking = true;
        this.currentIndex = startIndex;
        this.speakingSessionId = Date.now();
        
        const playBtn = document.getElementById('tts-play-btn');
        const stopBtn = document.getElementById('tts-stop-btn');
        if (playBtn) playBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';

        this.speakNext();
        this.startKeepAlive();
    },

    stop() {
        if (!this.isSpeaking && !this.isSelectionMode) return;
        
        this.isSpeaking = false;
        this.speakingSessionId = null;
        // FIX: Use window.clearInterval to avoid type conflicts with Node.js 'Timeout' type.
        if (this.keepAliveInterval) window.clearInterval(this.keepAliveInterval);
        
        speechSynthesis.resume();
        speechSynthesis.cancel();
        
        this.cleanupUI();
    },

    cleanupUI() {
        this.deactivateSelectionMode();

        if (this.highlightedElement && this.originalElementContent) {
            this.highlightedElement.innerHTML = this.originalElementContent;
        }
        this.originalElementContent = null;
        this.highlightedWord = null;

        if (this.highlightedElement) {
            this.highlightedElement.classList.remove('tts-reading-highlight');
            this.highlightedElement = null;
        }
        
        const playBtn = document.getElementById('tts-play-btn');
        const stopBtn = document.getElementById('tts-stop-btn');
        if (playBtn) playBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
    },

    speakNext() {
        const sessionId = this.speakingSessionId;
        if (!this.isSpeaking || this.currentIndex >= this.elements.length || sessionId !== this.speakingSessionId) {
            this.stop();
            return;
        }

        const element = this.elements[this.currentIndex];
        let text: string;

        if (this.textToSpeak) {
            text = this.textToSpeak;
            this.textToSpeak = null;
        } else {
            text = element.innerText.trim();
        }

        if (!text) {
            this.currentIndex++;
            this.speakNext();
            return;
        }

        this.originalElementContent = element.innerHTML;
        const wordsAndSpaces = text.split(/(\s+)/);
        element.innerHTML = wordsAndSpaces.map(part => {
            if (part.trim().length > 0) {
                return `<span class="tts-word">${DOMPurify.sanitize(part)}</span>`;
            }
            return part;
        }).join('');
        const wordSpans = Array.from(element.querySelectorAll('.tts-word')) as HTMLElement[];
        let currentTextPos = 0;
        const wordBoundaries = wordSpans.map(span => {
            const spanText = span.textContent || '';
            const start = text.indexOf(spanText, currentTextPos);
            const end = start + spanText.length;
            currentTextPos = end;
            return { span, start, end };
        });

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        if (this.ptBrVoice) {
            utterance.voice = this.ptBrVoice;
        }
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        utterance.onstart = () => {
            if (sessionId !== this.speakingSessionId) return;
            if (this.highlightedElement) {
                this.highlightedElement.classList.remove('tts-reading-highlight');
            }
            element.classList.add('tts-reading-highlight');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.highlightedElement = element;
        };

        utterance.onboundary = (event) => {
            if (sessionId !== this.speakingSessionId || event.name !== 'word') return;

            if (this.highlightedWord) {
                this.highlightedWord.classList.remove('tts-word-highlight');
            }
            
            const boundary = wordBoundaries.find(b => event.charIndex >= b.start && event.charIndex < b.end);

            if (boundary) {
                const currentSpan = boundary.span;
                currentSpan.classList.add('tts-word-highlight');
                this.highlightedWord = currentSpan;
            }
        };

        utterance.onend = () => {
            if (sessionId !== this.speakingSessionId) return;

            if (element && this.originalElementContent) {
                element.innerHTML = this.originalElementContent;
            }
            this.originalElementContent = null;
            this.highlightedWord = null;

            this.currentIndex++;
            this.speakNext();
        };
        
        utterance.onerror = (event) => {
            if (sessionId !== this.speakingSessionId) return;
            if (event.error === 'interrupted') return;
            console.error("Speech synthesis error:", event.error);
            showToast("Ocorreu um erro na leitura.", "error");
            this.stop();
        };

        speechSynthesis.speak(utterance);
    },
    
    startKeepAlive() {
        // FIX: Use window.clearInterval to avoid type conflicts.
        if (this.keepAliveInterval) window.clearInterval(this.keepAliveInterval);
        // FIX: Use window.setInterval to ensure a 'number' return type in browser environments.
        this.keepAliveInterval = window.setInterval(() => {
            if (speechSynthesis.speaking) {
                speechSynthesis.resume();
            } else if (!this.isSpeaking) {
                 // FIX: Use window.clearInterval to match window.setInterval. The cast is acceptable
                 // as the interval is running, so keepAliveInterval must be a number.
                 window.clearInterval(this.keepAliveInterval as number);
            }
        }, 10000);
    }
};