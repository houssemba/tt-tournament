<script setup lang="ts">
import { CATEGORIES } from '~/utils/constants'
import { formatDateTime } from '~/utils/formatters'

const {
  playersByCategory,
  totalPlayers,
  loading,
  error,
  warning,
  lastFetch,
  fetchPlayers,
} = usePlayers()

// Fetch players on mount
onMounted(() => {
  fetchPlayers()
})

// Sort categories by sortOrder
const sortedCategories = computed(() => {
  return [...CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder)
})

useHead({
  title: 'Inscriptions - Tournoi Haute Vilaine Acigné (2 Mai 2026)',
  meta: [
    { name: 'description', content: 'Inscriptions au Tournoi régional de tennis de table Haute Vilaine - Acigné' },
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="Logo TTHV"
              class="h-14 w-14 sm:h-16 sm:w-16 object-contain"
            >
            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
                Tournoi Haute Vilaine - Acigné (2 Mai 2026)
              </h1>
              <p class="mt-1 text-sm text-gray-500">
                {{ totalPlayers }} joueur{{ totalPlayers !== 1 ? 's' : '' }} inscrit{{ totalPlayers !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <NuxtLink
              to="/stats"
              class="btn btn-secondary text-sm"
              aria-label="Voir les statistiques"
            >
              <svg
                class="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Statistiques
            </NuxtLink>
          </div>
        </div>

        <!-- Last updated timestamp -->
        <div
          v-if="lastFetch"
          class="mt-2 text-xs text-gray-400"
        >
          Dernière mise à jour : {{ formatDateTime(lastFetch) }}
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <!-- Error state -->
      <ErrorBanner
        v-if="error"
        :message="error"
        variant="error"
        show-retry
        class="mb-6"
        @retry="fetchPlayers"
      />

      <!-- Warning banner -->
      <ErrorBanner
        v-if="warning && !error"
        :message="warning"
        variant="warning"
        class="mb-6"
      />

      <!-- Loading state -->
      <div
        v-if="loading"
        class="space-y-4"
      >
        <div
          v-for="n in 6"
          :key="n"
          class="card p-4"
        >
          <LoadingSkeleton :rows="3" />
        </div>
      </div>

      <!-- Categories grid -->
      <div
        v-else
        class="space-y-4"
      >
        <CategoryCard
          v-for="category in sortedCategories"
          :key="category.id"
          :category-id="category.id"
          :players="playersByCategory.get(category.id) ?? []"
        />
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <a href="mailto:contact@tt-hautevilaine.com" class="block text-center text-sm text-gray-500 hover:text-primary-600 transition-colors">
          Made with <span class="text-red-500">&#10084;</span> for the TTHV
        </a>
      </div>
    </footer>
  </div>
</template>
