// GET /api/stats - Get tournament statistics

import type { Player, CategoryId } from '~/types/player'
import type { TournamentStats, StatsResponse, CategoryCount, ClubCount, DailyCount, PlayersResponse } from '~/types/stats'
import { getFromCache, setInCache, CACHE_KEYS } from '~/server/utils/cache'
import { ApiError } from '~/server/utils/errors'
import { CATEGORIES } from '~/utils/constants'

function computeStats(players: Player[]): TournamentStats {
  // Count by category
  const categoryMap = new Map<CategoryId, number>()
  for (const category of CATEGORIES) {
    categoryMap.set(category.id, 0)
  }

  for (const player of players) {
    for (const categoryId of player.categories) {
      const current = categoryMap.get(categoryId) ?? 0
      categoryMap.set(categoryId, current + 1)
    }
  }

  const byCategory: CategoryCount[] = CATEGORIES.map(cat => ({
    categoryId: cat.id,
    label: cat.label,
    count: categoryMap.get(cat.id) ?? 0,
  })).sort((a, b) => a.count - b.count)

  // Count by club (top 10)
  const clubMap = new Map<string, number>()
  for (const player of players) {
    const club = player.club ?? 'Club inconnu'
    const current = clubMap.get(club) ?? 0
    clubMap.set(club, current + 1)
  }

  const byClub: ClubCount[] = Array.from(clubMap.entries())
    .map(([club, count]) => ({ club, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Registration timeline (by day)
  const timelineMap = new Map<string, number>()
  for (const player of players) {
    const date = new Date(player.registrationDate)
    const dateKey = date.toISOString().split('T')[0]
    const current = timelineMap.get(dateKey) ?? 0
    timelineMap.set(dateKey, current + 1)
  }

  const registrationTimeline: DailyCount[] = Array.from(timelineMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalPlayers: players.length,
    byCategory,
    byClub,
    registrationTimeline,
    lastUpdated: new Date(),
  }
}

export default defineEventHandler(async (_event): Promise<StatsResponse> => {
  const config = useRuntimeConfig()
  const cacheTtl = config.cacheTtl || 600

  // Check stats cache first
  const cachedStats = await getFromCache<StatsResponse>(CACHE_KEYS.STATS)
  if (cachedStats) {
    return {
      ...cachedStats,
      fromCache: true,
    }
  }

  try {
    // Try to use cached players data first
    let players: Player[] = []
    const cachedPlayers = await getFromCache<PlayersResponse>(CACHE_KEYS.PLAYERS)

    if (cachedPlayers) {
      players = cachedPlayers.players.map(p => ({
        ...p,
        registrationDate: new Date(p.registrationDate),
      }))
    } else {
      // Fetch fresh players data via internal API call
      const playersResponse = await $fetch('/api/players') as PlayersResponse
      players = playersResponse.players.map((p: Player & { registrationDate: string | Date }) => ({
        ...p,
        registrationDate: new Date(p.registrationDate),
      }))
    }

    const stats = computeStats(players)

    const response: StatsResponse = {
      stats,
      fromCache: false,
      lastUpdated: new Date(),
    }

    // Cache the stats
    await setInCache(CACHE_KEYS.STATS, response, cacheTtl)

    return response
  } catch (error) {
    // Try to return cached stats even if stale
    const staleStats = await getFromCache<StatsResponse>(CACHE_KEYS.STATS)
    if (staleStats) {
      return {
        ...staleStats,
        fromCache: true,
      }
    }

    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(
      'Impossible de calculer les statistiques',
      500,
      'COMPUTE_STATS_ERROR'
    )
  }
})
