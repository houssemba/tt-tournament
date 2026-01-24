// GET /api/players - Return players from cache only

import type { PlayersResponse } from '~/types/stats'
import { getFromCache, CACHE_KEYS } from '~/server/utils/cache'

export default defineEventHandler(async (_event): Promise<PlayersResponse> => {
  // Read from cache only
  const cached = await getFromCache<PlayersResponse>(CACHE_KEYS.PLAYERS)

  if (cached) {
    return {
      ...cached,
      fromCache: true,
    }
  }

  // Return empty list with warning if no cache
  return {
    players: [],
    fromCache: false,
    lastUpdated: new Date(),
    warning: 'Aucune donnée en cache. Cliquez sur le bouton Rafraîchir pour charger les données.',
  }
})
