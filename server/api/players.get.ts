// GET /api/players - Fetch and return all registered players

import type { Player, CategoryId } from '~/types/player'
import type { PlayersResponse } from '~/types/stats'
import type { HelloAssoOrder, HelloAssoItem } from '~/types/helloasso'
import { getOrders } from '~/server/utils/helloasso'
import { getPlayersByLicenses } from '~/server/utils/fftt'
import { getFromCache, setInCache, CACHE_KEYS } from '~/server/utils/cache'
import { ApiError } from '~/server/utils/errors'
import { matchCategory } from '~/utils/constants'
import { cleanLicenseNumber } from '~/utils/validators'

const LICENSE_FIELD_NAMES = ['licence', 'numéro de licence', 'n° licence', 'license']

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

function extractPlayerFromOrder(order: HelloAssoOrder): {
  basePlayer: Omit<Player, 'club' | 'clubCode' | 'officialPoints'>
  licenseNumber: string | null
} | null {
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
    basePlayer: {
      id: order.id.toString(),
      firstName: order.payer.firstName,
      lastName: order.payer.lastName,
      email: order.payer.email,
      licenseNumber: licenseNumber || '',
      categories,
      registrationDate: new Date(order.date),
    },
    licenseNumber,
  }
}

export default defineEventHandler(async (_event): Promise<PlayersResponse> => {
  const config = useRuntimeConfig()
  const cacheTtl = config.cacheTtl || 600

  // Check cache first
  const cached = await getFromCache<PlayersResponse>(CACHE_KEYS.PLAYERS)
  if (cached) {
    return {
      ...cached,
      fromCache: true,
    }
  }

  let warning: string | undefined

  try {
    // Fetch orders from HelloAsso
    const orders = await getOrders()

    // Extract player data from orders
    const playerData = orders
      .map(order => extractPlayerFromOrder(order))
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // Collect all license numbers for FFTT enrichment
    const licenseNumbers = playerData
      .map(p => p.licenseNumber)
      .filter((l): l is string => l !== null && l !== '')

    // Fetch FFTT data in parallel
    let ffttData = new Map<string, Awaited<ReturnType<typeof getPlayersByLicenses>> extends Map<string, infer V> ? V : never>()
    try {
      ffttData = await getPlayersByLicenses(licenseNumbers)
    } catch (error) {
      console.error('FFTT enrichment failed:', error)
      warning = 'Les données de club et points n\'ont pas pu être récupérées'
    }

    // Build final player list with enrichment
    const players: Player[] = playerData.map(({ basePlayer, licenseNumber }) => {
      const ffttPlayer = licenseNumber ? ffttData.get(licenseNumber) : null

      return {
        ...basePlayer,
        club: ffttPlayer?.club ?? null,
        clubCode: ffttPlayer?.clubCode ?? null,
        officialPoints: ffttPlayer?.points ?? null,
      }
    })

    const response: PlayersResponse = {
      players,
      fromCache: false,
      lastUpdated: new Date(),
      warning,
    }

    // Cache the response
    await setInCache(CACHE_KEYS.PLAYERS, response, cacheTtl)

    return response
  } catch (error) {
    // Try to return cached data even if stale
    const staleCache = await getFromCache<PlayersResponse>(CACHE_KEYS.PLAYERS)
    if (staleCache) {
      return {
        ...staleCache,
        fromCache: true,
        warning: 'Données en cache (mise à jour impossible)',
      }
    }

    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(
      'Impossible de récupérer les inscriptions',
      500,
      'FETCH_PLAYERS_ERROR'
    )
  }
})
