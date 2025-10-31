// Advanced caching service for kiosk application

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxSize: number; // Maximum number of entries
  enableMemoryCache: boolean;
  enableLocalStorage: boolean;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      enableMemoryCache: true,
      enableLocalStorage: true,
      ...config
    };
  }

  // Set cache entry
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key
    };

    // Memory cache
    if (this.config.enableMemoryCache) {
      this.memoryCache.set(key, entry);
      this.cleanupMemoryCache();
    }

    // Local storage cache
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`kiosk_cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  }

  // Get cache entry
  get<T>(key: string): T | null {
    // Try memory cache first
    if (this.config.enableMemoryCache) {
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValid(memoryEntry)) {
        return memoryEntry.data;
      }
      if (memoryEntry) {
        this.memoryCache.delete(key);
      }
    }

    // Try localStorage cache
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`kiosk_cache_${key}`);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            // Restore to memory cache
            if (this.config.enableMemoryCache) {
              this.memoryCache.set(key, entry);
            }
            return entry.data;
          } else {
            localStorage.removeItem(`kiosk_cache_${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage:', error);
      }
    }

    return null;
  }

  // Check if cache entry is valid
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // Remove cache entry
  delete(key: string): void {
    if (this.config.enableMemoryCache) {
      this.memoryCache.delete(key);
    }
    
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      localStorage.removeItem(`kiosk_cache_${key}`);
    }
  }

  // Clear all cache
  clear(): void {
    if (this.config.enableMemoryCache) {
      this.memoryCache.clear();
    }
    
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('kiosk_cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  // Cleanup expired entries from memory cache
  private cleanupMemoryCache(): void {
    const entriesToDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (!this.isValid(entry)) {
        entriesToDelete.push(key);
      }
    });

    entriesToDelete.forEach(key => {
      this.memoryCache.delete(key);
    });

    // Remove oldest entries if cache is too large
    if (this.memoryCache.size > this.config.maxSize) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.config.maxSize);
      toRemove.forEach(([key]) => {
        this.memoryCache.delete(key);
      });
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      localStorageEnabled: this.config.enableLocalStorage,
      memoryCacheEnabled: this.config.enableMemoryCache,
      maxSize: this.config.maxSize,
      defaultTTL: this.config.defaultTTL
    };
  }

  // Preload data with cache
  async preload<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Fetch and cache
    try {
      const data = await fetchFn();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Failed to preload data for key ${key}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const cacheService = new CacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  enableMemoryCache: true,
  enableLocalStorage: true
});

// Cache keys for different data types
export const CACHE_KEYS = {
  WEATHER: 'weather_data',
  BUILDING_INFO: 'building_info',
  ANNOUNCEMENTS: 'announcements',
  VOTES: 'votes',
  FINANCIAL_INFO: 'financial_info',
  MAINTENANCE_INFO: 'maintenance_info',
  PROJECTS_INFO: 'projects_info',
  KIOSK_CONFIG: 'kiosk_config'
} as const;

// Utility functions for common cache operations
export const cacheUtils = {
  // Cache weather data for 10 minutes
  setWeather: (data: any) => cacheService.set(CACHE_KEYS.WEATHER, data, 10 * 60 * 1000),
  getWeather: () => cacheService.get(CACHE_KEYS.WEATHER),
  
  // Cache building info for 30 minutes
  setBuildingInfo: (data: any) => cacheService.set(CACHE_KEYS.BUILDING_INFO, data, 30 * 60 * 1000),
  getBuildingInfo: () => cacheService.get(CACHE_KEYS.BUILDING_INFO),
  
  // Cache announcements for 5 minutes
  setAnnouncements: (data: any) => cacheService.set(CACHE_KEYS.ANNOUNCEMENTS, data, 5 * 60 * 1000),
  getAnnouncements: () => cacheService.get(CACHE_KEYS.ANNOUNCEMENTS),
  
  // Cache votes for 10 minutes
  setVotes: (data: any) => cacheService.set(CACHE_KEYS.VOTES, data, 10 * 60 * 1000),
  getVotes: () => cacheService.get(CACHE_KEYS.VOTES),
  
  // Cache financial info for 15 minutes
  setFinancialInfo: (data: any) => cacheService.set(CACHE_KEYS.FINANCIAL_INFO, data, 15 * 60 * 1000),
  getFinancialInfo: () => cacheService.get(CACHE_KEYS.FINANCIAL_INFO),
  
  // Cache kiosk config for 1 hour
  setKioskConfig: (data: any) => cacheService.set(CACHE_KEYS.KIOSK_CONFIG, data, 60 * 60 * 1000),
  getKioskConfig: () => cacheService.get(CACHE_KEYS.KIOSK_CONFIG),
  
  // Clear all caches
  clearAll: () => cacheService.clear(),
  
  // Get cache statistics
  getStats: () => cacheService.getStats()
};
