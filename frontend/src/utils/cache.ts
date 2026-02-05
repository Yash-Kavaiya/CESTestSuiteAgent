/**
 * Simple cache utility using localStorage for stale-while-revalidate pattern.
 * Shows cached data immediately while fetching fresh data in the background.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    agentId: string;
}

const CACHE_PREFIX = 'app_cache_';
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes default max age

export interface CacheOptions {
    maxAgeMs?: number; // How long cached data is considered "fresh"
}

/**
 * Get cached data for a specific key and agent
 */
export function getCache<T>(key: string, agentId: string): T | null {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}_${agentId}`;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) return null;

        const entry: CacheEntry<T> = JSON.parse(cached);

        // Verify the agentId matches
        if (entry.agentId !== agentId) return null;

        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Set cached data for a specific key and agent
 */
export function setCache<T>(key: string, agentId: string, data: T): void {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}_${agentId}`;
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            agentId,
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
        // Silently fail if localStorage is full or unavailable
    }
}

/**
 * Check if cached data is stale (older than maxAgeMs)
 */
export function isCacheStale(key: string, agentId: string, maxAgeMs = DEFAULT_MAX_AGE_MS): boolean {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}_${agentId}`;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) return true;

        const entry: CacheEntry<unknown> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;

        return age > maxAgeMs;
    } catch {
        return true;
    }
}

/**
 * Clear cached data for a specific key and agent
 */
export function clearCache(key: string, agentId: string): void {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}_${agentId}`;
        localStorage.removeItem(cacheKey);
    } catch {
        // Silently fail
    }
}

/**
 * Clear all cached data for an agent
 */
export function clearAgentCache(agentId: string): void {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX) && key.endsWith(`_${agentId}`)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
        // Silently fail
    }
}

// Cache keys for different pages
export const CACHE_KEYS = {
    DASHBOARD_METRICS: 'dashboard_metrics',
    COVERAGE_DATA: 'coverage_data',
    AI_ANALYSIS_SESSIONS: 'ai_analysis_sessions',
    AI_ANALYSIS_SUMMARY: 'ai_analysis_summary',
    RAI_DATASETS: 'rai_datasets',
    RAI_TEST_HISTORY: 'rai_test_history',
    RAI_TEST_RESULTS: 'rai_test_results',
} as const;
