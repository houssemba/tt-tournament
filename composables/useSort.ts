// Generic sorting composable for player tables

import type { Player } from '~/types/player'

export type SortKey = 'lastName' | 'firstName' | 'registrationDate'
export type SortDirection = 'asc' | 'desc'

export function useSort(initialKey: SortKey = 'lastName', initialDirection: SortDirection = 'asc') {
  const sortKey = ref<SortKey>(initialKey)
  const sortDirection = ref<SortDirection>(initialDirection)

  function toggleSort(key: SortKey) {
    if (sortKey.value === key) {
      // Toggle direction if same column
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      // New column, start with ascending
      sortKey.value = key
      sortDirection.value = 'asc'
    }
  }

  function sortPlayers(players: Player[]): Player[] {
    const sorted = [...players]
    const direction = sortDirection.value === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortKey.value) {
        case 'lastName':
          comparison = a.lastName.localeCompare(b.lastName, 'fr')
          break
        case 'firstName':
          comparison = a.firstName.localeCompare(b.firstName, 'fr')
          break
        case 'registrationDate': {
          const dateA = new Date(a.registrationDate).getTime()
          const dateB = new Date(b.registrationDate).getTime()
          comparison = dateA - dateB
          break
        }
      }

      return comparison * direction
    })

    return sorted
  }

  return {
    sortKey: readonly(sortKey),
    sortDirection: readonly(sortDirection),
    toggleSort,
    sortPlayers,
  }
}
