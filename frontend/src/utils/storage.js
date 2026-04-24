/**
 * Storage utility that gracefully handles storage access
 * when tracking prevention is enabled in browsers like Safari and Edge.
 * Falls back to in-memory storage if localStorage is unavailable.
 */

let inMemoryStorage = {};

function isStorageAvailable(type) {
    try {
        const storage = window[type];
        const test = '__storage_test__';
        storage.setItem(test, test);
        storage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

const storageEnabled = {
    localStorage: isStorageAvailable('localStorage'),
    sessionStorage: isStorageAvailable('sessionStorage')
};

export const storage = {
    setItem: (key, value) => {
        try {
            if (storageEnabled.localStorage) {
                localStorage.setItem(key, value);
            } else {
                console.warn('[Storage] localStorage unavailable (tracking prevention enabled?), using in-memory storage');
                inMemoryStorage[key] = value;
            }
        } catch (e) {
            console.error('[Storage] Error setting item:', e);
            inMemoryStorage[key] = value;
        }
    },
    
    getItem: (key) => {
        try {
            if (storageEnabled.localStorage) {
                return localStorage.getItem(key);
            } else {
                return inMemoryStorage[key] || null;
            }
        } catch (e) {
            console.error('[Storage] Error getting item:', e);
            return inMemoryStorage[key] || null;
        }
    },
    
    removeItem: (key) => {
        try {
            if (storageEnabled.localStorage) {
                localStorage.removeItem(key);
            } else {
                delete inMemoryStorage[key];
            }
        } catch (e) {
            console.error('[Storage] Error removing item:', e);
            delete inMemoryStorage[key];
        }
    },
    
    clear: () => {
        try {
            if (storageEnabled.localStorage) {
                localStorage.clear();
            } else {
                inMemoryStorage = {};
            }
        } catch (e) {
            console.error('[Storage] Error clearing storage:', e);
            inMemoryStorage = {};
        }
    },
    
    isAvailable: () => storageEnabled.localStorage
};

export default storage;
