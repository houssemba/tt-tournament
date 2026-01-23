<script setup lang="ts">
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import type { Player, CategoryId } from '~/types/player'
import { getCategoryById } from '~/utils/constants'

interface Props {
  categoryId: CategoryId
  players: Player[]
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: true,
})

const category = computed(() => getCategoryById(props.categoryId))
const playerCount = computed(() => props.players.length)
</script>

<template>
  <Disclosure
    v-slot="{ open }"
    :default-open="defaultOpen"
    as="div"
    class="card overflow-hidden"
  >
    <DisclosureButton
      class="w-full flex items-center justify-between px-4 py-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 hover:bg-gray-50 transition-colors min-h-[44px]"
      :aria-expanded="open"
      :aria-controls="`category-panel-${categoryId}`"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ category?.label ?? categoryId }}
        </h2>
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="playerCount > 0 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'"
        >
          {{ playerCount }} joueur{{ playerCount !== 1 ? 's' : '' }}
        </span>
      </div>

      <svg
        class="h-5 w-5 text-gray-500 transition-transform duration-200"
        :class="{ 'rotate-180': open }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </DisclosureButton>

    <DisclosurePanel
      :id="`category-panel-${categoryId}`"
      class="border-t border-gray-200"
    >
      <PlayerTable :players="players" />
    </DisclosurePanel>
  </Disclosure>
</template>
