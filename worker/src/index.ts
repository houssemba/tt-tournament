// Cloudflare Worker for refreshing HelloAsso players cache

interface Env {
  KV: KVNamespace
  HELLOASSO_CLIENT_ID: string
  HELLOASSO_CLIENT_SECRET: string
  HELLOASSO_ORGANIZATION_SLUG: string
  HELLOASSO_FORM_SLUG: string
  CACHE_TTL?: string
}

// Types
type CategoryId = '500-799' | '500-999' | '500-1199' | '500-1399' | '500-1799' | 'tc-feminin'

interface Player {
  id: string
  licenseNumber: string
  firstName: string
  lastName: string
  club: string | null
  officialPoints: number | null
  categories: CategoryId[]
  registrationDate: Date
}

interface PlayersResponse {
  players: Player[]
  fromCache: boolean
  lastUpdated: Date
}

interface HelloAssoCustomField {
  name: string
  type: string
  answer: string
}

interface HelloAssoPayer {
  firstName: string
  lastName: string
  email: string
}

interface HelloAssoItem {
  id: number
  name: string
  priceCategory: string
  customFields?: HelloAssoCustomField[]
  amount: number
  type: string
  state: string
  payer?: HelloAssoPayer
  order?: {
    id: number
    date: string
    formSlug: string
  }
}

interface HelloAssoPagination {
  pageSize: number
  totalCount: number
  pageIndex: number
  totalPages: number
  continuationToken?: string
}

interface HelloAssoPaginatedResponse<T> {
  data: T[]
  pagination: HelloAssoPagination
}

interface HelloAssoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
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

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// Category patterns
const CATEGORY_PATTERNS: { id: CategoryId; pattern: RegExp }[] = [
  { id: '500-799', pattern: /500[- ]?799|tableau\s*1/i },
  { id: '500-999', pattern: /500[- ]?999|tableau\s*2/i },
  { id: '500-1199', pattern: /500[- ]?1199|tableau\s*3/i },
  { id: '500-1399', pattern: /500[- ]?1399|tableau\s*4/i },
  { id: '500-1799', pattern: /500[- ]?1799|tableau\s*5/i },
  { id: 'tc-feminin', pattern: /f[eé]minin|tc\s*f|women/i },
]

const INFO_ITEM_NAME = 'obligatoire - informations complémentaires'
const HELLOASSO_AUTH_URL = 'https://api.helloasso.com/oauth2/token'
const HELLOASSO_API_BASE = 'https://api.helloasso.com/v5'

function matchCategory(productName: string): CategoryId | null {
  for (const { id, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(productName)) {
      return id
    }
  }
  return null
}

function cleanLicenseNumber(licenseNumber: string): string | null {
  if (!licenseNumber) return null
  const cleaned = licenseNumber.replace(/[\s-]/g, '')
  if (!/^\d{6,7}$/.test(cleaned)) return null
  return cleaned
}

async function hashOrderId(orderId: number): Promise<string> {
  const data = new TextEncoder().encode(String(orderId))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getAccessToken(env: Env): Promise<string> {
  const response = await fetch(HELLOASSO_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.HELLOASSO_CLIENT_ID,
      client_secret: env.HELLOASSO_CLIENT_SECRET,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HelloAsso auth error: ${errorText}`)
  }

  const data = await response.json() as HelloAssoTokenResponse
  return data.access_token
}

async function getItems(env: Env, accessToken: string): Promise<HelloAssoItem[]> {
  const allItems: HelloAssoItem[] = []
  let continuationToken: string | undefined
  const pageSize = 100
  const maxPages = 50

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      withDetails: 'true',
    })

    if (continuationToken) {
      params.set('continuationToken', continuationToken)
    } else {
      params.set('pageIndex', '1')
    }

    const response = await fetch(
      `${HELLOASSO_API_BASE}/organizations/${env.HELLOASSO_ORGANIZATION_SLUG}/forms/Event/${env.HELLOASSO_FORM_SLUG}/items?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HelloAsso API error: ${errorText}`)
    }

    const data = await response.json() as HelloAssoPaginatedResponse<HelloAssoItem>
    allItems.push(...data.data)

    if (!data.pagination.continuationToken || data.data.length === 0) {
      break
    }

    continuationToken = data.pagination.continuationToken
  }

  return allItems
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

      players.push({
        id: playerId,
        licenseNumber: playerInfo.licenseNumber ?? '',
        firstName: playerInfo.firstName,
        lastName: playerInfo.lastName,
        club: playerInfo.club,
        officialPoints: playerInfo.officialPoints,
        categories: playerInfo.categories,
        registrationDate: new Date(playerInfo.date),
      })
    }
  }

  return players
}

async function refreshCache(env: Env): Promise<string> {
  console.log('[Worker] Refreshing players cache...')

  const accessToken = await getAccessToken(env)
  const items = await getItems(env, accessToken)
  const players = await extractPlayersFromItems(items)

  const playersResponse: PlayersResponse = {
    players,
    fromCache: false,
    lastUpdated: new Date(),
  }

  const cacheTtl = parseInt(env.CACHE_TTL || '600', 10)

  const cacheEntry: CacheEntry<PlayersResponse> = {
    data: playersResponse,
    timestamp: Date.now(),
    ttl: cacheTtl,
  }

  await env.KV.put('players', JSON.stringify(cacheEntry))

  console.log(`[Worker] Cache refreshed with ${players.length} players`)
  return `Refreshed ${players.length} players`
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refreshCache(env))
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const result = await refreshCache(env)
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}
