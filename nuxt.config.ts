// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      title: 'Tournoi Haute Vilaine - Acigné',
      meta: [
        { name: 'description', content: 'Tournoi régional de tennis de table Haute Vilaine - Acigné' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  modules: [
    '@nuxthub/core',
    '@nuxtjs/tailwindcss',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  hub: {
    kv: true,
  },

  nitro: {
    preset: 'cloudflare-pages',
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // Run every minute (Cloudflare minimum interval)
      '*/1 * * * *': ['refresh-cache'],
    },
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    helloassoClientId: process.env.HELLOASSO_CLIENT_ID || '',
    helloassoClientSecret: process.env.HELLOASSO_CLIENT_SECRET || '',
    helloassoOrganizationSlug: process.env.HELLOASSO_ORGANIZATION_SLUG || '',
    helloassoFormSlug: process.env.HELLOASSO_FORM_SLUG || '',
    cacheTtl: parseInt(process.env.CACHE_TTL || '600', 10),
  },
})
