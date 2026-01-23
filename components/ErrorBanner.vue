<script setup lang="ts">
interface Props {
  message: string
  variant?: 'error' | 'warning'
  showRetry?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'error',
  showRetry: false,
})

const emit = defineEmits<{
  retry: []
}>()

const variantClasses = computed(() => {
  if (props.variant === 'warning') {
    return {
      container: 'bg-amber-50 border-amber-200',
      icon: 'text-amber-600',
      text: 'text-amber-800',
      button: 'text-amber-600 hover:text-amber-800 hover:bg-amber-100',
    }
  }
  return {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
    button: 'text-red-600 hover:text-red-800 hover:bg-red-100',
  }
})
</script>

<template>
  <div
    :class="[variantClasses.container, 'rounded-lg border p-4']"
    role="alert"
    :aria-live="variant === 'error' ? 'assertive' : 'polite'"
  >
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div :class="[variantClasses.icon, 'flex-shrink-0']">
        <svg
          v-if="variant === 'error'"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <svg
          v-else
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p :class="[variantClasses.text, 'text-sm font-medium']">
          {{ message }}
        </p>
      </div>

      <!-- Retry button -->
      <button
        v-if="showRetry"
        type="button"
        :class="[variantClasses.button, 'flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2']"
        @click="emit('retry')"
      >
        Réessayer
      </button>
    </div>
  </div>
</template>
