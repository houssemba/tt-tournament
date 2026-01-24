// HelloAsso OAuth2 client and API utilities

import type {
  HelloAssoTokenResponse,
  HelloAssoPaginatedResponse,
  HelloAssoOrder,
  HelloAssoItem,
} from '~/types/helloasso'
import { ApiError, withRetry } from './errors'
import { getFromCache, setInCache, deleteFromCache, CACHE_KEYS } from './cache'

const HELLOASSO_AUTH_URL = 'https://api.helloasso.com/oauth2/token'
const HELLOASSO_API_BASE = 'https://api.helloasso.com/v5'

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

interface TokenExpiredError {
  is401: true
  errorText: string
}

function isTokenExpiredError(error: unknown): error is TokenExpiredError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'is401' in error &&
    'errorText' in error
  )
}

/**
 * Clear all token caches (in-memory and KV)
 */
async function clearTokenCache(): Promise<void> {
  tokenCache = null
  await deleteFromCache(CACHE_KEYS.HELLOASSO_TOKEN)
}

/**
 * Get an OAuth2 access token from HelloAsso
 * Uses client credentials flow
 * @param forceRefresh - If true, ignores cache and requests a new token
 */
async function getAccessToken(forceRefresh: boolean = false): Promise<string> {
  const config = useRuntimeConfig()

  if (!forceRefresh) {
    // Check in-memory cache first
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
      return tokenCache.accessToken
    }

    // Check KV cache
    const cachedToken = await getFromCache<TokenCache>(CACHE_KEYS.HELLOASSO_TOKEN)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
      tokenCache = cachedToken
      return cachedToken.accessToken
    }
  }

  // Clear any stale cache
  await clearTokenCache()

  // Request new token
  const response = await withRetry(async () => {
    const res = await fetch(HELLOASSO_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.helloassoClientId,
        client_secret: config.helloassoClientSecret,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      if (res.status === 401) {
        throw ApiError.unauthorized(`HelloAsso authentication failed: ${errorText}`)
      }
      if (res.status === 429) {
        throw ApiError.rateLimited('HelloAsso rate limit exceeded')
      }
      throw new ApiError(`HelloAsso auth error: ${errorText}`, res.status, 'HELLOASSO_AUTH_ERROR', true)
    }

    return res.json() as Promise<HelloAssoTokenResponse>
  })

  // Cache the token
  const expiresAt = Date.now() + (response.expires_in - 300) * 1000 // 5 min buffer
  tokenCache = {
    accessToken: response.access_token,
    expiresAt,
  }

  // Also cache in KV for persistence
  await setInCache(CACHE_KEYS.HELLOASSO_TOKEN, tokenCache, response.expires_in - 300)

  return response.access_token
}

/**
 * Make an authenticated request to HelloAsso API
 * Automatically retries with a fresh token on 401
 */
async function helloassoFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let accessToken = await getAccessToken()

  const makeRequest = async (token: string) => {
    const res = await fetch(`${HELLOASSO_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      if (res.status === 401) {
        throw { is401: true, errorText }
      }
      if (res.status === 404) {
        throw ApiError.notFound(`HelloAsso resource not found: ${endpoint}`)
      }
      if (res.status === 429) {
        throw ApiError.rateLimited('HelloAsso rate limit exceeded')
      }
      throw new ApiError(`HelloAsso API error: ${errorText}`, res.status, 'HELLOASSO_API_ERROR', true)
    }

    return res.json() as Promise<T>
  }

  try {
    return await withRetry(() => makeRequest(accessToken))
  } catch (error) {
    // If we got a 401, clear cache and retry with a fresh token
    if (isTokenExpiredError(error)) {
      await clearTokenCache()
      accessToken = await getAccessToken(true)
      try {
        return await makeRequest(accessToken)
      } catch (retryError) {
        if (isTokenExpiredError(retryError)) {
          throw ApiError.unauthorized(`HelloAsso API unauthorized: ${retryError.errorText}`)
        }
        throw retryError
      }
    }
    throw error
  }
}

/**
 * Get all orders from a HelloAsso form
 * Handles pagination automatically
 */
export async function getOrders(): Promise<HelloAssoOrder[]> {
  const config = useRuntimeConfig()
  const orgSlug = config.helloassoOrganizationSlug
  const formSlug = config.helloassoFormSlug

  if (!orgSlug || !formSlug) {
    throw ApiError.badRequest('HelloAsso organization or form slug not configured')
  }

  const allOrders: HelloAssoOrder[] = []
  let continuationToken: string | undefined
  const pageSize = 100
  const maxPages = 50 // Safety limit

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
    })

    // Use continuationToken for subsequent pages, pageIndex only for first page
    if (continuationToken) {
      params.set('continuationToken', continuationToken)
    } else {
      params.set('pageIndex', '1')
    }

    const response = await helloassoFetch<HelloAssoPaginatedResponse<HelloAssoOrder>>(
      `/organizations/${orgSlug}/forms/Event/${formSlug}/orders?${params}`
    )

    allOrders.push(...response.data)

    // Stop if no more pages
    if (!response.pagination.continuationToken || response.data.length === 0) {
      break
    }

    continuationToken = response.pagination.continuationToken
  }

  return allOrders
}

/**
 * Get all items from a HelloAsso form
 * Items include custom fields (unlike orders)
 * Handles pagination automatically
 */
export async function getItems(): Promise<HelloAssoItem[]> {
  const config = useRuntimeConfig()
  const orgSlug = config.helloassoOrganizationSlug
  const formSlug = config.helloassoFormSlug

  if (!orgSlug || !formSlug) {
    throw ApiError.badRequest('HelloAsso organization or form slug not configured')
  }

  const allItems: HelloAssoItem[] = []
  let continuationToken: string | undefined
  const pageSize = 100
  const maxPages = 50 // Safety limit

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      withDetails: 'true',
    })

    // Use continuationToken for subsequent pages, pageIndex only for first page
    if (continuationToken) {
      params.set('continuationToken', continuationToken)
    } else {
      params.set('pageIndex', '1')
    }

    const response = await helloassoFetch<HelloAssoPaginatedResponse<HelloAssoItem>>(
      `/organizations/${orgSlug}/forms/Event/${formSlug}/items?${params}`
    )

    allItems.push(...response.data)

    // Stop if no more pages
    if (!response.pagination.continuationToken || response.data.length === 0) {
      break
    }

    continuationToken = response.pagination.continuationToken
  }

  return allItems
}
