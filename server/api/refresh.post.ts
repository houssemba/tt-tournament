// POST /api/refresh - Fetch from HelloAsso and cache data

import type { Player, CategoryId } from '~/types/player'
import type { RefreshResponse, PlayersResponse } from '~/types/stats'
import type { HelloAssoItem } from '~/types/helloasso'
import { getItems } from '~/server/utils/helloasso'
import { deleteMultipleFromCache, CACHE_KEYS, getFromCache, setInCache } from '~/server/utils/cache'
import { ApiError } from '~/server/utils/errors'
import { matchCategory } from '~/utils/constants'
import { cleanLicenseNumber } from '~/utils/validators'

const RATE_LIMIT_TTL = 60 // 1 minute rate limit
const RATE_LIMIT_KEY = 'refresh_rate_limit'

const INFO_ITEM_NAME = 'obligatoire - informations complémentaires'

interface RateLimitEntry {
  timestamp: number
}

interface PlayerInfo {
  oderId: number
  firstName: string
  lastName: string
  email: string
  date: string
  licenseNumber: string | null
  club: string | null
  officialPoints: number | null
  categories: CategoryId[]
}

/**
 * Group items by order ID and extract player info
 */
function extractPlayersFromItems(items: HelloAssoItem[]): Player[] {
  // Group items by order ID
  const orderMap = new Map<number, HelloAssoItem[]>()

  for (const item of items) {
    const orderId = item.order?.id
    if (!orderId) continue

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, [])
    }
    orderMap.get(orderId)!.push(item)
  }

  // Process each order's items
  const players: Player[] = []

  for (const [orderId, orderItems] of orderMap) {
    const playerInfo: PlayerInfo = {
      oderId: orderId,
      firstName: '',
      lastName: '',
      email: '',
      date: '',
      licenseNumber: null,
      club: null,
      officialPoints: null,
      categories: [],
    }

    for (const item of orderItems) {
      // Get payer info from item
      if (item.payer) {
        playerInfo.firstName = item.payer.firstName
        playerInfo.lastName = item.payer.lastName
        playerInfo.email = item.payer.email
      }
      if (item.order?.date) {
        playerInfo.date = item.order.date
      }

      // Check if this is a category item
      const categoryId = matchCategory(item.name)
      if (categoryId) {
        playerInfo.categories.push(categoryId)
      }

      // Check if this is the info item with custom fields
      const itemName = item.name.toLowerCase().trim()
      if (itemName.includes(INFO_ITEM_NAME) && item.customFields) {
        for (const field of item.customFields) {
          const fieldName = field.name.toLowerCase().trim()
          const answer = field.answer?.trim() || ''

          if (fieldName.includes('licence') || fieldName.includes('license')) {
            playerInfo.licenseNumber = cleanLicenseNumber(answer)
          } else if (fieldName.includes('club')) {
            playerInfo.club = answer || null
          } else if (fieldName.includes('points')) {
            const points = parseInt(answer, 10)
            playerInfo.officialPoints = isNaN(points) ? null : points
          }
        }
      }
    }

    // Only create player if they have categories
    if (playerInfo.categories.length > 0 && playerInfo.firstName) {
      players.push({
        id: orderId.toString(),
        firstName: playerInfo.firstName,
        lastName: playerInfo.lastName,
        email: playerInfo.email,
        licenseNumber: playerInfo.licenseNumber || '',
        club: playerInfo.club,
        officialPoints: playerInfo.officialPoints,
        categories: playerInfo.categories,
        registrationDate: new Date(playerInfo.date),
      })
    }
  }

  return players
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

    // Fetch items from HelloAsso (items include custom fields)
    const items = await getItems()

    // Extract players from items
    const players = extractPlayersFromItems(items)

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
