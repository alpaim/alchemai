const STORAGE_KEY = "alchemai-state";

export function loadFromStorage<T>(key: string = STORAGE_KEY): T | null {
    try {
        const stored = localStorage.getItem(key);

        if (!stored) {
            return null;
        }

        return JSON.parse(stored) as T;
    }
    catch {
        console.error("Failed to load from storage");

        return null;
    }
}

export function saveToStorage<T>(data: T, key: string = STORAGE_KEY): void {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    }
    catch {
        console.error("Failed to save to storage");
    }
}

export function clearStorage(key: string = STORAGE_KEY): void {
    try {
        localStorage.removeItem(key);
    }
    catch {
        console.error("Failed to clear storage");
    }
}