// Cloudflare KV cache utilities using NuxtHub's kv
import { kv } from 'hub:kv'
import type { StorageValue } from 'unstorage'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Get a value from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
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
  } catch {
    return null
  }
}

/**
 * Set a value in cache
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    }

    await kv.set(key, entry)
  } catch {
    // ignore
  }
}

/**
 * Delete a value from cache
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    await kv.del(key)
  } catch {
    // ignore
  }
}

/**
 * Get a raw value from KV (no TTL wrapper)
 */
export async function getRawFromCache<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key)
  } catch {
    return null
  }
}

/**
 * Set a raw value in KV (no TTL wrapper)
 */
export async function setRawInCache<T extends StorageValue>(key: string, value: T): Promise<void> {
  try {
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
