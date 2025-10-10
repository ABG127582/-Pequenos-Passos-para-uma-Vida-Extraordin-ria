// storage.ts
// Centralized service for managing localStorage with an in-memory cache.

import { showToast } from './utils';
import { CONFIG } from './constants';

class StorageService {
    private cache = new Map<string, any>();
    private readonly MAX_CACHE_SIZE = CONFIG.STORAGE_CACHE_SIZE;

    /**
     * Retrieves an item from storage, checking the in-memory cache first.
     * @param key The key of the item to retrieve.
     * @returns The parsed item, or null if not found or on error.
     */
    get<T>(key: string): T | null {
        if (this.cache.has(key)) {
            return this.cache.get(key) as T;
        }
        
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            this.updateCache(key, parsed);
            return parsed as T;
        } catch (error) {
            console.error(`StorageService: Error getting item for key "${key}":`, error);
            return null;
        }
    }

    /**
     * Saves an item to localStorage and updates the in-memory cache.
     * @param key The key to save the item under.
     * @param value The value to save. It will be JSON.stringified.
     * @returns `true` on success, `false` on failure.
     */
    set<T>(key: string, value: T): boolean {
        try {
            const stringifiedValue = JSON.stringify(value);
            localStorage.setItem(key, stringifiedValue);
            this.updateCache(key, value);
            return true;
        } catch (error) {
            console.error(`StorageService: Error setting item for key "${key}":`, error);
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                showToast('O armazenamento local está cheio. Não foi possível salvar os dados.', 'error');
                // Potential future implementation: clear some old data.
            }
            return false;
        }
    }

    /**
     * Removes an item from localStorage and the cache.
     * @param key The key of the item to remove.
     */
    remove(key: string): void {
        this.cache.delete(key);
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`StorageService: Error removing item for key "${key}":`, error);
        }
    }

    /**
     * Updates the in-memory cache, managing its size.
     * @param key The key to add/update.
     * @param value The value to cache.
     */
    private updateCache(key: string, value: any) {
        if (this.cache.has(key)) {
            this.cache.delete(key); // Delete and re-add to move it to the end (most recent)
        }
        
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            // Evict the least recently used item (the first one in the Map's insertion order)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}

// Export a singleton instance of the service
export const storageService = new StorageService();