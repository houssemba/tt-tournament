// Composable for fetching tournament statistics

import type { TournamentStats, StatsResponse } from '~/types/stats'

export function useStats() {
  const stats = ref<TournamentStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastFetch = ref<Date | null>(null)
  const fromCache = ref(false)

  async function fetchStats() {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<StatsResponse>('/api/stats')

      stats.value = {
        ...response.stats,
        lastUpdated: new Date(response.stats.lastUpdated),
      }
      lastFetch.value = new Date(response.lastUpdated)
      fromCache.value = response.fromCache
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      error.value = err instanceof Error ? err.message : 'Impossible de charger les statistiques'
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    loading,
    error,
    lastFetch,
    fromCache,
    fetchStats,
  }
}
