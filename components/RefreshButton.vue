<script setup lang="ts">
interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  refresh: []
}>()

const { refreshing, error, refresh } = useRefresh()

const isDisabled = computed(() => props.loading || refreshing.value)

async function handleRefresh() {
  const success = await refresh()
  if (success) {
    emit('refresh')
  }
}

// Show toast/notification for errors
const showError = ref(false)

watch(error, (newError) => {
  if (newError) {
    showError.value = true
    setTimeout(() => {
      showError.value = false
    }, 5000)
  }
})
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="btn btn-primary text-sm"
      :disabled="isDisabled"
      :aria-busy="refreshing"
      aria-label="Rafraîchir les données"
      @click="handleRefresh"
    >
      <!-- Refresh icon -->
      <svg
        class="h-4 w-4 mr-2 transition-transform"
        :class="{ 'animate-spin': refreshing }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {{ refreshing ? 'Rafraîchissement...' : 'Rafraîchir' }}
    </button>

    <!-- Error toast -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="showError && error"
        class="absolute right-0 top-full mt-2 w-64 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg z-10"
        role="alert"
      >
        <div class="flex items-start gap-2">
          <svg
            class="h-5 w-5 text-red-600 flex-shrink-0"
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
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>
