// Composable for fetching and managing player data

import type { Player, CategoryId } from '~/types/player'
import type { PlayersResponse } from '~/types/stats'
import { CATEGORIES } from '~/utils/constants'

export function usePlayers() {
  const players = ref<Player[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const warning = ref<string | null>(null)
  const lastFetch = ref<Date | null>(null)
  const fromCache = ref(false)

  const playersByCategory = computed(() => {
    const grouped = new Map<CategoryId, Player[]>()

    // Initialize all categories with empty arrays
    for (const category of CATEGORIES) {
      grouped.set(category.id, [])
    }

    // Group players by category
    for (const player of players.value) {
      for (const categoryId of player.categories) {
        const categoryPlayers = grouped.get(categoryId)
        if (categoryPlayers) {
          categoryPlayers.push(player)
        }
      }
    }

    return grouped
  })

  const totalPlayers = computed(() => players.value.length)

  const categoryCounts = computed(() => {
    const counts: Record<CategoryId, number> = {} as Record<CategoryId, number>
    for (const category of CATEGORIES) {
      counts[category.id] = playersByCategory.value.get(category.id)?.length ?? 0
    }
    return counts
  })

  async function fetchPlayers() {
    loading.value = true
    error.value = null
    warning.value = null

    try {
      const response = await $fetch('/api/players') as PlayersResponse

      players.value = response.players.map((p: Player & { registrationDate: string | Date }) => ({
        ...p,
        registrationDate: new Date(p.registrationDate),
      }))
      lastFetch.value = new Date(response.lastUpdated)
      fromCache.value = response.fromCache
      warning.value = response.warning ?? null
    } catch (err) {
      console.error('Failed to fetch players:', err)
      error.value = err instanceof Error ? err.message : 'Impossible de charger les inscriptions'
    } finally {
      loading.value = false
    }
  }

  return {
    players,
    playersByCategory,
    totalPlayers,
    categoryCounts,
    loading,
    error,
    warning,
    lastFetch,
    fromCache,
    fetchPlayers,
  }
}
