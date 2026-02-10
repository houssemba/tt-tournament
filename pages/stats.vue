<script setup lang="ts">
import { formatDateTime } from '~/utils/formatters'

const { stats, loading, error, lastFetch, fetchStats } = useStats()

// Fetch stats on mount
onMounted(() => {
  fetchStats()
})

// Chart colors
const categoryColors = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
]

// Category pie chart data
const categoryChartData = computed(() => {
  if (!stats.value) return null

  return {
    labels: stats.value.byCategory.map(c => c.label),
    datasets: [
      {
        data: stats.value.byCategory.map(c => c.count),
        backgroundColor: categoryColors,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }
})

// Club bar chart data
const clubChartData = computed(() => {
  if (!stats.value || !stats.value.byClub) return null

  return {
    labels: stats.value.byClub.map(c => c.club),
    datasets: [
      {
        label: 'Joueurs',
        data: stats.value.byClub.map(c => c.count),
        backgroundColor: '#3B82F6',
        borderRadius: 4,
      },
    ],
  }
})

// Timeline line chart data
const timelineChartData = computed(() => {
  if (!stats.value) return null

  return {
    labels: stats.value.registrationTimeline.map(t => {
      const date = new Date(t.date)
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }),
    datasets: [
      {
        label: 'Inscriptions',
        data: stats.value.registrationTimeline.map(t => t.count),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  }
})

useHead({
  title: 'Statistiques - Tournoi Haute Vilaine Acigné',
  meta: [
    { name: 'description', content: 'Statistiques du Tournoi régional de tennis de table Haute Vilaine - Acigné' },
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
                Statistiques
              </h1>
              <p
                v-if="lastFetch"
                class="mt-1 text-sm text-gray-500"
              >
                Dernière mise à jour : {{ formatDateTime(lastFetch) }}
              </p>
            </div>
          </div>

          <NuxtLink
            to="/"
            class="btn btn-secondary text-sm"
            aria-label="Retour aux inscriptions"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Inscriptions
          </NuxtLink>
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
        @retry="fetchStats"
      />

      <!-- Loading state -->
      <div
        v-if="loading"
        class="space-y-6"
      >
        <div class="card p-6 animate-pulse">
          <div class="h-8 bg-gray-200 rounded w-32" />
          <div class="mt-4 h-12 bg-gray-200 rounded w-24" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-6 animate-pulse">
            <div class="h-64 bg-gray-200 rounded" />
          </div>
          <div class="card p-6 animate-pulse">
            <div class="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      <!-- Stats content -->
      <div
        v-else-if="stats"
        class="space-y-6"
      >
        <!-- Total players card -->
        <StatsCard
          label="Total des inscriptions"
          :value="stats.totalPlayers"
        />

        <!-- Charts grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Category pie chart -->
          <ChartContainer
            v-if="categoryChartData"
            type="pie"
            :data="categoryChartData"
            title="Répartition par catégorie"
            :aspect-ratio="1.5"
          />

          <!-- Club bar chart -->
          <ChartContainer
            v-if="clubChartData"
            type="bar"
            :data="clubChartData"
            title="Top 10 des clubs"
            :aspect-ratio="1.5"
          />
        </div>

        <!-- Timeline chart (full width) -->
        <ChartContainer
          v-if="timelineChartData"
          type="line"
          :data="timelineChartData"
          title="Évolution des inscriptions"
          :aspect-ratio="3"
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
