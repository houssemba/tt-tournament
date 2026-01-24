// Cloudflare KV cache utilities using Nitro's useStorage

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Get storage instance - uses KV in production, memory in development
 */
function getStorage() {
  // In NuxtHub, the 'kv' storage is automatically configured
  return useStorage('kv')
}

/**
 * Get a value from cache
 * @param key - Cache key
 * @returns The cached value or null if not found or expired
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const storage = getStorage()
    const entry = await storage.getItem<CacheEntry<T>>(key)

    if (!entry) {
      return null
    }

    const now = Date.now()
    const isExpired = now - entry.timestamp > entry.ttl * 1000

    if (isExpired) {
      // Clean up expired entry
      await storage.removeItem(key)
      return null
    }

    return entry.data
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error)
    return null
  }
}

/**
 * Set a value in cache
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const storage = getStorage()
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    }

    await storage.setItem(key, entry)
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error)
    // Don't throw - caching is best-effort
  }
}

/**
 * Delete a value from cache
 * @param key - Cache key
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    const storage = getStorage()
    await storage.removeItem(key)
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error)
    // Don't throw - cache deletion is best-effort
  }
}

/**
 * Delete multiple keys from cache
 * @param keys - Array of cache keys
 */
export async function deleteMultipleFromCache(keys: string[]): Promise<void> {
  try {
    const storage = getStorage()
    await Promise.all(keys.map(key => storage.removeItem(key)))
  } catch (error) {
    console.error('Cache delete multiple error:', error)
  }
}

// Cache key constants
export const CACHE_KEYS = {
  PLAYERS: 'players',
  STATS: 'stats',
  HELLOASSO_TOKEN: 'helloasso_token',
}
