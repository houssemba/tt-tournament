// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
    ffttApiId: process.env.FFTT_API_ID || '',
    ffttApiKey: process.env.FFTT_API_KEY || '',
    cacheTtl: parseInt(process.env.CACHE_TTL || '600', 10),
  },
})
