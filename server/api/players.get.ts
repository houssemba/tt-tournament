// GET /api/players - Return players from cache with overrides applied

import type { Player } from '~/types/player'
import type { PlayersResponse } from '~/types/stats'
import { getFromCache, getRawFromCache, CACHE_KEYS } from '~/server/utils/cache'

interface PlayerOverride {
  licenseNumber?: string
  club?: string
  officialPoints?: number
}

function applyOverrides(players: Player[], overrides: Record<string, PlayerOverride>): Player[] {
  return players.map(player => {
    const override = overrides[player.id]
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
    const overrides = await getRawFromCache<Record<string, PlayerOverride>>(CACHE_KEYS.OVERRIDES) ?? {}
    return {
      ...cached,
      players: applyOverrides(cached.players, overrides),
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
