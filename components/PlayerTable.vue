<script setup lang="ts">
import type { Player } from '~/types/player'
import type { SortKey } from '~/composables/useSort'
import { formatPlayerName, formatPoints, formatClub } from '~/utils/formatters'

interface Props {
  players: Player[]
}

const props = defineProps<Props>()

const { sortKey, sortDirection, toggleSort, sortPlayers } = useSort('lastName', 'asc')

const sortedPlayers = computed(() => sortPlayers(props.players))

interface ColumnConfig {
  key: SortKey
  label: string
  class?: string
}

const columns: ColumnConfig[] = [
  { key: 'licenseNumber', label: 'Licence' },
  { key: 'lastName', label: 'Nom' },
  { key: 'club', label: 'Club' },
  { key: 'officialPoints', label: 'Points' },
]

function getSortIcon(key: SortKey): string {
  if (sortKey.value !== key) return ''
  return sortDirection.value === 'asc' ? '↑' : '↓'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table
      v-if="players.length > 0"
      class="min-w-full divide-y divide-gray-200"
      role="table"
    >
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            <button
              type="button"
              class="group inline-flex items-center gap-1 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded px-1 -mx-1 min-h-[44px] min-w-[44px]"
              :aria-label="`Trier par ${column.label}`"
              :aria-sort="sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              @click="toggleSort(column.key)"
            >
              {{ column.label }}
              <span
                v-if="sortKey === column.key"
                class="text-primary-600"
                aria-hidden="true"
              >
                {{ getSortIcon(column.key) }}
              </span>
              <span
                v-else
                class="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
              >
                ↕
              </span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr
          v-for="player in sortedPlayers"
          :key="player.id"
          class="hover:bg-gray-50"
        >
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="text-sm font-mono text-gray-600">
              {{ player.licenseNumber || 'N/A' }}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="text-sm font-medium text-gray-900">
              {{ formatPlayerName(player.firstName, player.lastName) }}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="text-sm text-gray-600">
              {{ formatClub(player.club) }}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="text-sm text-gray-600">
              {{ formatPoints(player.officialPoints) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-8 text-gray-500"
      role="status"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <p class="mt-2 text-sm">Aucune inscription</p>
    </div>
  </div>
</template>
