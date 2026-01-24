// Scheduled task to refresh players cache from HelloAsso

import type { Player, CategoryId } from '~/types/player'
import type { PlayersResponse } from '~/types/stats'
import type { HelloAssoItem } from '~/types/helloasso'
import { getItems } from '~/server/utils/helloasso'
import { CACHE_KEYS, setInCache } from '~/server/utils/cache'
import { matchCategory } from '~/utils/constants'
import { cleanLicenseNumber } from '~/utils/validators'
import overrides from '~/data/overrides.json'

const INFO_ITEM_NAME = 'obligatoire - informations complémentaires'

/**
 * Generate a deterministic ID from order ID using SHA-256
 */
async function hashOrderId(orderId: number): Promise<string> {
  const data = new TextEncoder().encode(String(orderId))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface PlayerOverride {
  licenseNumber?: string
  club?: string
  officialPoints?: number
}

interface PlayerInfo {
  firstName: string
  lastName: string
  date: string
  licenseNumber: string | null
  club: string | null
  officialPoints: number | null
  categories: CategoryId[]
}

async function extractPlayersFromItems(items: HelloAssoItem[]): Promise<Player[]> {
  const orderMap = new Map<number, HelloAssoItem[]>()

  for (const item of items) {
    const orderId = item.order?.id
    if (!orderId) continue

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, [])
    }
    orderMap.get(orderId)!.push(item)
  }

  const players: Player[] = []

  for (const [orderId, orderItems] of orderMap) {
    const playerInfo: PlayerInfo = {
      firstName: '',
      lastName: '',
      date: '',
      licenseNumber: null,
      club: null,
      officialPoints: null,
      categories: [],
    }

    for (const item of orderItems) {
      if (item.payer) {
        playerInfo.firstName = item.payer.firstName
        playerInfo.lastName = item.payer.lastName
      }
      if (item.order?.date) {
        playerInfo.date = item.order.date
      }

      const categoryId = matchCategory(item.name)
      if (categoryId) {
        playerInfo.categories.push(categoryId)
      }

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

    if (playerInfo.categories.length > 0 && playerInfo.firstName) {
      const playerId = await hashOrderId(orderId)

      // Apply overrides from JSON file using player UUID as key
      const override: PlayerOverride | undefined =
        (overrides as Record<string, PlayerOverride>)[playerId]

      players.push({
        id: playerId,
        licenseNumber: override?.licenseNumber ?? playerInfo.licenseNumber ?? '',
        firstName: playerInfo.firstName,
        lastName: playerInfo.lastName,
        club: override?.club ?? playerInfo.club,
        officialPoints: override?.officialPoints ?? playerInfo.officialPoints,
        categories: playerInfo.categories,
        registrationDate: new Date(playerInfo.date),
      })
    }
  }

  return players
}

export default defineTask({
  meta: {
    name: 'refresh-cache',
    description: 'Refresh players cache from HelloAsso',
  },
  async run() {
    console.log('[Scheduled Task] Refreshing players cache...')

    try {
      const items = await getItems()
      const players = await extractPlayersFromItems(items)

      const playersResponse: PlayersResponse = {
        players,
        fromCache: false,
        lastUpdated: new Date(),
      }

      const config = useRuntimeConfig()
      const cacheTtl = config.cacheTtl || 600

      await setInCache(CACHE_KEYS.PLAYERS, playersResponse, cacheTtl)

      console.log(`[Scheduled Task] Cache refreshed with ${players.length} players`)

      return { result: `Refreshed ${players.length} players` }
    } catch (error) {
      console.error('[Scheduled Task] Failed to refresh cache:', error)
      return { result: 'Failed', error: String(error) }
    }
  },
})
