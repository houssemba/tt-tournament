// GET /api/players - Return players from cache with overrides applied

import type { Player } from '~/types/player'
import type { PlayersResponse } from '~/types/stats'
import { getFromCache, CACHE_KEYS } from '~/server/utils/cache'
import overrides from '~/data/overrides.json'

interface PlayerOverride {
  licenseNumber?: string
  club?: string
  officialPoints?: number
}

function applyOverrides(players: Player[]): Player[] {
  return players.map(player => {
    const override = (overrides as Record<string, PlayerOverride>)[player.id]
    if (!override) return player

    return {
      ...player,
      licenseNumber: override.licenseNumber ?? player.licenseNumber,
      club: override.club ?? player.club,
      officialPoints: override.officialPoints ?? player.officialPoints,
    }
  })
}

export default defineEventHandler(async (_event): Promise<PlayersResponse> => {
  const cached = await getFromCache<PlayersResponse>(CACHE_KEYS.PLAYERS)

  if (cached) {
    return {
      ...cached,
      players: applyOverrides(cached.players),
      fromCache: true,
    }
  }

  return {
    players: [],
    fromCache: false,
    lastUpdated: new Date(),
    warning: 'Aucune donnée en cache. Les données seront disponibles sous peu.',
  }
})
