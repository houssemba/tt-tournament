<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  trend: undefined,
  trendValue: undefined,
})

const trendClasses = computed(() => {
  switch (props.trend) {
    case 'up':
      return 'text-green-600 bg-green-100'
    case 'down':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
})

const trendIcon = computed(() => {
  switch (props.trend) {
    case 'up':
      return '↑'
    case 'down':
      return '↓'
    default:
      return '→'
  }
})
</script>

<template>
  <div class="card p-6">
    <dt class="text-sm font-medium text-gray-500 truncate">
      {{ label }}
    </dt>
    <dd class="mt-2 flex items-baseline gap-2">
      <span class="text-3xl font-bold text-gray-900">
        {{ value }}
      </span>
      <span
        v-if="trend && trendValue"
        :class="[trendClasses, 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium']"
      >
        <span aria-hidden="true">{{ trendIcon }}</span>
        {{ trendValue }}
      </span>
    </dd>
  </div>
</template>
