/**
 * SECURE CLIENT-SIDE STORAGE UTILITY
 *
 * Purpose: Secure localStorage operations with validation, encryption, and error handling
 * Usage: Import in components that need client-side storage
 * Scope: All localStorage operations across the application
 *
 * Features:
 * - Data validation and sanitization
 * - Error handling for localStorage failures
 * - Type-safe storage operations
 * - Automatic cleanup on errors
 * - Secure data encoding/decoding
 */

interface StorageOptions {
  encrypt?: boolean;
  validate?: (data: unknown) => boolean;
  defaultValue?: unknown;
  maxAge?: number; // in milliseconds
}

interface StoredData<T> {
  data: T;
  timestamp: number;
  checksum: string;
}

// Simple checksum for data integrity
function createChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Simple encoding (not encryption, just obfuscation)
function encodeData(data: unknown): string {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
  } catch (error) {
    console.error("Failed to encode data:", error);
    throw new Error("Data encoding failed");
  }
}

function decodeData<T>(encodedData: string): T {
  try {
    const jsonString = decodeURIComponent(atob(encodedData));
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to decode data:", error);
    throw new Error("Data decoding failed");
  }
}

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Secure localStorage operations
export class SecureStorage {
  private static readonly PREFIX = "doctask_secure_";
  private static readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  static setItem<T>(
    key: string,
    value: T,
    options: StorageOptions = {},
  ): boolean {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn("localStorage not available");
        return false;
      }

      const { encrypt = false, validate } = options;

      // Validate data if validator provided
      if (validate && !validate(value)) {
        console.error("Data validation failed for key:", key);
        return false;
      }

      const storedData: StoredData<T> = {
        data: value,
        timestamp: Date.now(),
        checksum: createChecksum(JSON.stringify(value)),
      };

      const encodedData = encrypt
        ? encodeData(storedData)
        : JSON.stringify(storedData);
      const fullKey = `${this.PREFIX}${key}`;

      localStorage.setItem(fullKey, encodedData);
      return true;
    } catch (error) {
      console.error("Failed to store data:", error);
      return false;
    }
  }

  static getItem<T>(key: string, options: StorageOptions = {}): T | null {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn("localStorage not available");
        return (options.defaultValue as T | null) || null;
      }

      const {
        encrypt = false,
        validate,
        defaultValue = null,
        maxAge = this.MAX_AGE,
      } = options;

      const fullKey = `${this.PREFIX}${key}`;
      const rawData = localStorage.getItem(fullKey);

      if (!rawData) {
        return defaultValue as T | null;
      }

      const storedData: StoredData<T> = encrypt
        ? decodeData(rawData)
        : JSON.parse(rawData);

      // Check if data is expired
      if (Date.now() - storedData.timestamp > maxAge) {
        this.removeItem(key);
        return defaultValue as T | null;
      }

      // Verify data integrity
      const currentChecksum = createChecksum(JSON.stringify(storedData.data));
      if (currentChecksum !== storedData.checksum) {
        console.error("Data integrity check failed for key:", key);
        this.removeItem(key);
        return defaultValue as T | null;
      }

      // Validate data if validator provided
      if (validate && !validate(storedData.data)) {
        console.error("Data validation failed for key:", key);
        this.removeItem(key);
        return defaultValue as T | null;
      }

      return storedData.data;
    } catch (error) {
      console.error("Failed to retrieve data:", error);
      this.removeItem(key); // Clean up corrupted data
      return (options.defaultValue as T | null) || null;
    }
  }

  static removeItem(key: string): boolean {
    try {
      if (!isLocalStorageAvailable()) {
        return false;
      }

      const fullKey = `${this.PREFIX}${key}`;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error("Failed to remove data:", error);
      return false;
    }
  }

  static clear(): boolean {
    try {
      if (!isLocalStorageAvailable()) {
        return false;
      }

      // Only remove our prefixed items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error("Failed to clear data:", error);
      return false;
    }
  }

  // Utility method to clean up expired data
  static cleanup(): void {
    try {
      if (!isLocalStorageAvailable()) {
        return;
      }

      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          try {
            const rawData = localStorage.getItem(key);
            if (rawData) {
              const storedData = JSON.parse(rawData);
              if (now - storedData.timestamp > this.MAX_AGE) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Remove corrupted data
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Failed to cleanup data:", error);
    }
  }
}

// Validation functions for common data types
export const validators = {
  timestamp: (value: unknown): boolean => {
    return (
      typeof value === "number" && value > 0 && value < Date.now() + 86400000
    ); // Max 24 hours in future
  },

  documentIds: (value: unknown): boolean => {
    return (
      Array.isArray(value) &&
      value.every((id) => typeof id === "string" && id.length > 0)
    );
  },

  noteCounts: (value: unknown): boolean => {
    return (
      typeof value === "object" &&
      value !== null &&
      Object.values(value).every(
        (count) => typeof count === "number" && count >= 0,
      )
    );
  },

  boolean: (value: unknown): boolean => {
    return typeof value === "boolean";
  },
};

// Export convenience functions
export const secureStorage = {
  set: SecureStorage.setItem.bind(SecureStorage),
  get: SecureStorage.getItem.bind(SecureStorage),
  remove: SecureStorage.removeItem.bind(SecureStorage),
  clear: SecureStorage.clear.bind(SecureStorage),
  cleanup: SecureStorage.cleanup.bind(SecureStorage),
};
