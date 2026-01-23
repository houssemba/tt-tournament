// Composable for manual data refresh

import type { RefreshResponse } from '~/types/stats'

export function useRefresh() {
  const refreshing = ref(false)
  const error = ref<string | null>(null)
  const lastRefresh = ref<Date | null>(null)

  async function refresh(): Promise<boolean> {
    if (refreshing.value) return false

    refreshing.value = true
    error.value = null

    try {
      const response = await $fetch<RefreshResponse>('/api/refresh', {
        method: 'POST',
      })

      lastRefresh.value = new Date(response.timestamp)

      if (!response.success) {
        error.value = response.message
        return false
      }

      return true
    } catch (err: unknown) {
      console.error('Refresh failed:', err)

      // Handle rate limit error
      if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 429) {
        const fetchError = err as { data?: { message?: string } }
        error.value = fetchError.data?.message || 'Trop de requêtes, veuillez patienter'
      } else {
        error.value = err instanceof Error ? err.message : 'Erreur lors du rafraîchissement'
      }

      return false
    } finally {
      refreshing.value = false
    }
  }

  return {
    refreshing: readonly(refreshing),
    error: readonly(error),
    lastRefresh: readonly(lastRefresh),
    refresh,
  }
}
