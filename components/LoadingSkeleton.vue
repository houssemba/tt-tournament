<script setup lang="ts">
interface Props {
  rows?: number
  columns?: number
}

const props = withDefaults(defineProps<Props>(), {
  rows: 5,
  columns: 4,
})
</script>

<template>
  <div class="animate-pulse" role="status" aria-label="Chargement en cours">
    <div class="overflow-hidden rounded-lg border border-gray-200">
      <!-- Header skeleton -->
      <div class="bg-gray-100 px-4 py-3">
        <div class="flex gap-4">
          <div
            v-for="col in props.columns"
            :key="`header-${col}`"
            class="h-4 bg-gray-300 rounded flex-1"
          />
        </div>
      </div>

      <!-- Row skeletons -->
      <div class="divide-y divide-gray-200">
        <div
          v-for="row in props.rows"
          :key="`row-${row}`"
          class="px-4 py-3"
        >
          <div class="flex gap-4">
            <div
              v-for="col in props.columns"
              :key="`cell-${row}-${col}`"
              class="h-4 bg-gray-200 rounded flex-1"
              :class="{ 'max-w-[120px]': col === 1 }"
            />
          </div>
        </div>
      </div>
    </div>
    <span class="sr-only">Chargement...</span>
  </div>
</template>
