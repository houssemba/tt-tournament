// POST /api/refresh - Fetch from HelloAsso and cache data

import type { Player, CategoryId } from '~/types/player'
import type { RefreshResponse, PlayersResponse } from '~/types/stats'
import type { HelloAssoOrder, HelloAssoItem } from '~/types/helloasso'
import { getOrders } from '~/server/utils/helloasso'
import { deleteMultipleFromCache, CACHE_KEYS, getFromCache, setInCache } from '~/server/utils/cache'
import { ApiError } from '~/server/utils/errors'
import { matchCategory } from '~/utils/constants'
import { cleanLicenseNumber } from '~/utils/validators'

const RATE_LIMIT_TTL = 1 // 1 minute rate limit
const RATE_LIMIT_KEY = 'refresh_rate_limit'

const LICENSE_FIELD_NAMES = ['licence', 'numéro de licence', 'n° licence', 'license']

interface RateLimitEntry {
  timestamp: number
}

function findLicenseNumber(item: HelloAssoItem): string | null {
  for (const field of item.customFields || []) {
    const fieldName = field.name.toLowerCase().trim()
    if (LICENSE_FIELD_NAMES.some(name => fieldName.includes(name))) {
      return cleanLicenseNumber(field.answer)
    }
  }
  return null
}

function extractCategoriesFromOrder(order: HelloAssoOrder): CategoryId[] {
  const categories: Set<CategoryId> = new Set()

  for (const item of order.items || []) {
    const categoryId = matchCategory(item.name)
    if (categoryId) {
      categories.add(categoryId)
    }
  }

  return Array.from(categories)
}

function extractPlayerFromOrder(order: HelloAssoOrder): Player | null {
  const categories = extractCategoriesFromOrder(order)
  if (categories.length === 0) {
    return null
  }

  // Find license number from first item with custom fields
  let licenseNumber: string | null = null
  for (const item of order.items || []) {
    licenseNumber = findLicenseNumber(item)
    if (licenseNumber) break
  }

  return {
    id: order.id.toString(),
    firstName: order.payer.firstName,
    lastName: order.payer.lastName,
    email: order.payer.email,
    licenseNumber: licenseNumber || '',
    categories,
    registrationDate: new Date(order.date),
  }
}

export default defineEventHandler(async (_event): Promise<RefreshResponse> => {
  // Check rate limit
  const rateLimitEntry = await getFromCache<RateLimitEntry>(RATE_LIMIT_KEY)
  const now = Date.now()

  if (rateLimitEntry && (now - rateLimitEntry.timestamp) < RATE_LIMIT_TTL * 1000) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_TTL * 1000 - (now - rateLimitEntry.timestamp)) / 1000)
    throw ApiError.rateLimited(
      `Veuillez attendre ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''} avant de rafraîchir`
    )
  }

  const config = useRuntimeConfig()
  const cacheTtl = config.cacheTtl || 600

  try {
    // Set rate limit before processing
    await setInCache<RateLimitEntry>(RATE_LIMIT_KEY, { timestamp: now }, RATE_LIMIT_TTL)

    // Invalidate cache
    await deleteMultipleFromCache([
      CACHE_KEYS.PLAYERS,
      CACHE_KEYS.STATS,
    ])

    // Fetch orders from HelloAsso
    const orders = await getOrders()

    console.log("foo")
    console.log("orders", orders);

    // Extract player data from orders
    const players: Player[] = orders
      .map(order => extractPlayerFromOrder(order))
      .filter((p): p is Player => p !== null)

    const playersResponse: PlayersResponse = {
      players,
      fromCache: false,
      lastUpdated: new Date(),
    }

    // Cache the response
    await setInCache(CACHE_KEYS.PLAYERS, playersResponse, cacheTtl)

    return {
      success: true,
      message: `Données rafraîchies avec succès (${players.length} joueurs)`,
      timestamp: new Date(),
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    console.error('Refresh error:', error)

    return {
      success: false,
      message: 'Erreur lors du rafraîchissement des données',
      timestamp: new Date(),
    }
  }
})
