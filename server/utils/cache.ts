// Cloudflare KV cache utilities using NuxtHub's hubKV

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Get a value from cache
 * @param key - Cache key
 * @returns The cached value or null if not found or expired
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const kv = hubKV()
    const entry = await kv.get<CacheEntry<T>>(key)

    if (!entry) {
      return null
    }

    const now = Date.now()
    const isExpired = now - entry.timestamp > entry.ttl * 1000

    if (isExpired) {
      await kv.del(key)
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
    const kv = hubKV()
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    }

    await kv.set(key, entry)
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error)
  }
}

/**
 * Delete a value from cache
 * @param key - Cache key
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    const kv = hubKV()
    await kv.del(key)
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error)
  }
}

/**
 * Get a raw value from KV (no TTL wrapper)
 */
export async function getRawFromCache<T>(key: string): Promise<T | null> {
  try {
    const kv = hubKV()
    return await kv.get<T>(key)
  } catch {
    return null
  }
}

/**
 * Set a raw value in KV (no TTL wrapper)
 */
export async function setRawInCache<T>(key: string, value: T): Promise<void> {
  try {
    const kv = hubKV()
    await kv.set(key, value)
  } catch {
    // ignore
  }
}

// Cache key constants
export const CACHE_KEYS = {
  PLAYERS: 'players',
  STATS: 'stats',
  HELLOASSO_TOKEN: 'helloasso_token',
  OVERRIDES: 'overrides',
}
