import { StorageOptions } from '../types';

class StorageManager {
  private static instance: StorageManager;
  private storagePrefix = 'pointmoney_';
  private persistentKeys = new Set(['auth_credentials', 'users', 'point-storage', 'withdrawal-storage']);

  private constructor() {
    // Initialize storage but don't clear persistent data
    this.cleanNonPersistentData();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private getKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  private cleanNonPersistentData(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storagePrefix)) {
          const unprefixedKey = key.replace(this.storagePrefix, '');
          if (!this.persistentKeys.has(unprefixedKey)) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Storage cleanup error:', error);
    }
  }

  get(key: string, defaultValue: any = null): any {
    try {
      const prefixedKey = this.getKey(key);
      const value = localStorage.getItem(prefixedKey);
      if (!value) return defaultValue;

      const parsed = JSON.parse(value);
      return parsed === null ? defaultValue : parsed;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  set(key: string, value: any, options: StorageOptions = {}): boolean {
    try {
      const prefixedKey = this.getKey(key);
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(prefixedKey, serializedValue);

      // Backup to sessionStorage for redundancy
      sessionStorage.setItem(prefixedKey, serializedValue);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      const prefixedKey = this.getKey(key);
      localStorage.removeItem(prefixedKey);
      sessionStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  clearAll(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storagePrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  isPersistentKey(key: string): boolean {
    return this.persistentKeys.has(key);
  }

  sync(): void {
    try {
      // Sync from localStorage to sessionStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            sessionStorage.setItem(key, value);
          }
        }
      }

      // Sync from sessionStorage to localStorage (only for persistent keys)
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const unprefixedKey = key.replace(this.storagePrefix, '');
          if (this.isPersistentKey(unprefixedKey)) {
            const value = sessionStorage.getItem(key);
            if (value) {
              localStorage.setItem(key, value);
            }
          }
        }
      }
    } catch (error) {
      console.error('Storage sync error:', error);
    }
  }
}

export const storage = StorageManager.getInstance();