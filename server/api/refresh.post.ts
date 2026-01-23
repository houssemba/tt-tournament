// POST /api/refresh - Invalidate cache and refresh data

import type { RefreshResponse } from '~/types/stats'
import { deleteMultipleFromCache, CACHE_KEYS, getFromCache, setInCache } from '~/server/utils/cache'
import { ApiError } from '~/server/utils/errors'

const RATE_LIMIT_TTL = 60 // 1 minute rate limit
const RATE_LIMIT_KEY = 'refresh_rate_limit'

interface RateLimitEntry {
  timestamp: number
}

export default defineEventHandler(async (_event): Promise<RefreshResponse> => {
  // Check rate limit
  const rateLimitEntry = await getFromCache<RateLimitEntry>(RATE_LIMIT_KEY)
  const now = Date.now()

  if (rateLimitEntry && (now - rateLimitEntry.timestamp) < RATE_LIMIT_TTL * 1000) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_TTL * 1000 - (now - rateLimitEntry.timestamp)) / 1000)
    throw ApiError.rateLimited(
      `Veuillez attendre ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''} avant de rafraîchir`
    )
  }

  try {
    // Set rate limit before processing
    await setInCache<RateLimitEntry>(RATE_LIMIT_KEY, { timestamp: now }, RATE_LIMIT_TTL)

    // Invalidate cache
    await deleteMultipleFromCache([
      CACHE_KEYS.PLAYERS,
      CACHE_KEYS.STATS,
    ])

    // Trigger fresh data fetch
    const playersResponse = await $fetch('/api/players')

    return {
      success: true,
      message: `Données rafraîchies avec succès (${playersResponse.players.length} joueurs)`,
      timestamp: new Date(),
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    console.error('Refresh error:', error)

    return {
      success: false,
      message: 'Erreur lors du rafraîchissement des données',
      timestamp: new Date(),
    }
  }
})
