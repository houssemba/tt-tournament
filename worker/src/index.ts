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
  email?: string
}

// The actual participant (may differ from payer when someone pays for others)
interface HelloAssoParticipant {
  firstName: string
  lastName: string
  email?: string
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
  user?: HelloAssoParticipant
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

// Legacy format used a separate product named 'obligatoire - informations complémentaires'
// New format has custom fields directly on each product (tableau)
// Both formats are supported by extracting customFields from any item
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

interface TokenCache {
  accessToken: string
  expiresAt: number
}

async function getAccessToken(env: Env, forceRefresh = false): Promise<string> {
  const TOKEN_KEY = 'helloasso_token'

  // Try to get cached token
  if (!forceRefresh) {
    try {
      const cached = await env.KV.get<TokenCache>(TOKEN_KEY, 'json')
      if (cached && cached.expiresAt > Date.now() + 60000) {
        return cached.accessToken
      }
    } catch {
      // Ignore cache errors
    }
  }

  // Get fresh token
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
    throw new Error(`HelloAsso auth failed with status ${response.status}`)
  }

  const data = await response.json() as HelloAssoTokenResponse

  // Cache the token
  const tokenCache: TokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }

  try {
    await env.KV.put(TOKEN_KEY, JSON.stringify(tokenCache), {
      expirationTtl: data.expires_in - 300,
    })
  } catch {
    // Ignore cache errors
  }

  return data.access_token
}

async function getItems(env: Env, accessToken: string, retry = true): Promise<HelloAssoItem[]> {
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

    // Retry with fresh token on 401/403
    if ((response.status === 401 || response.status === 403) && retry) {
      const newToken = await getAccessToken(env, true)
      return getItems(env, newToken, false)
    }

    if (!response.ok) {
      throw new Error(`HelloAsso API failed with status ${response.status}`)
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

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function extractPlayersFromItems(items: HelloAssoItem[]): Promise<Player[]> {
  // Pre-process: build a per-order license map to support the legacy format where
  // licence/club/points lived on a separate "obligatoire - informations complémentaires"
  // item rather than on each tableau item directly.
  // Without this, the "obligatoire" item (which has a licence) and the tableau item
  // (which has no customFields) would end up grouped separately and both be discarded.
  const orderLicenseMap = new Map<number, string>()
  for (const item of items) {
    if (!item.order?.id || !item.customFields) continue
    for (const field of item.customFields) {
      const fieldName = field.name.toLowerCase().trim()
      if (fieldName.includes('licence') || fieldName.includes('license')) {
        const license = cleanLicenseNumber(field.answer?.trim() || '')
        if (license && !orderLicenseMap.has(item.order.id)) {
          orderLicenseMap.set(item.order.id, license)
        }
        break
      }
    }
  }

  // Group items by participant identity using the following priority:
  // 1. item.user.email  — HelloAsso provides a distinct participant when someone pays for others
  // 2. License number — from item's own customFields, or from order-level (legacy format)
  // 3. item.payer.email — fallback for self-registrations with no license
  //
  // This ensures that a single payer registering N participants creates N separate records,
  // while a single participant with multiple tableau items is correctly merged into one.
  const participantMap = new Map<string, HelloAssoItem[]>()

  // Track payer email → license keys to enable a merge pass afterwards.
  // Used to fix the case where the same participant made multiple orders and only
  // provided their license in some of them.
  const payerToLicenseKeys = new Map<string, Set<string>>()

  for (const item of items) {
    // Priority 1: participant email (item.user is the actual beneficiary, not the payer)
    const participantEmail = item.user?.email?.toLowerCase().trim()
    if (participantEmail) {
      const key = `user:${participantEmail}`
      if (!participantMap.has(key)) participantMap.set(key, [])
      participantMap.get(key)!.push(item)
      continue
    }

    // Priority 2: license from item's own customFields, then order-level fallback (legacy)
    let licenseNumber: string | null = null
    if (item.customFields) {
      for (const field of item.customFields) {
        const fieldName = field.name.toLowerCase().trim()
        if (fieldName.includes('licence') || fieldName.includes('license')) {
          licenseNumber = cleanLicenseNumber(field.answer?.trim() || '')
          break
        }
      }
    }
    if (!licenseNumber && item.order?.id) {
      licenseNumber = orderLicenseMap.get(item.order.id) ?? null
    }
    if (licenseNumber) {
      const key = `license:${licenseNumber}`
      if (!participantMap.has(key)) participantMap.set(key, [])
      participantMap.get(key)!.push(item)

      // Record payer → license association for the merge pass below
      const payerEmail = item.payer?.email?.toLowerCase().trim()
      if (payerEmail) {
        if (!payerToLicenseKeys.has(payerEmail)) payerToLicenseKeys.set(payerEmail, new Set())
        payerToLicenseKeys.get(payerEmail)!.add(key)
      }
      continue
    }

    // Priority 3: payer email (self-registration without license)
    const payerEmail = item.payer?.email?.toLowerCase().trim()
    if (!payerEmail) continue

    const key = `payer:${payerEmail}`
    if (!participantMap.has(key)) participantMap.set(key, [])
    participantMap.get(key)!.push(item)
  }

  // Merge pass: fold payer: groups into their matching license: group when unambiguous.
  // Scenario: participant made two orders, provided license only in the first one.
  // - Exactly 1 license key for this payer → safe to merge (same participant)
  // - 2+ license keys for this payer → payer registered multiple people → keep separate
  for (const [key, groupItems] of [...participantMap.entries()]) {
    if (!key.startsWith('payer:')) continue
    const payerEmail = key.slice('payer:'.length)
    const licenseKeys = payerToLicenseKeys.get(payerEmail)
    if (licenseKeys?.size === 1) {
      const licenseKey = [...licenseKeys][0]
      participantMap.get(licenseKey)!.push(...groupItems)
      participantMap.delete(key)
    }
  }

  const players: Player[] = []

  for (const [key, groupItems] of participantMap) {
    const playerInfo: PlayerInfo = {
      firstName: '',
      lastName: '',
      date: '',
      licenseNumber: null,
      club: null,
      officialPoints: null,
      categories: [],
    }

    let earliestDate: Date | null = null

    for (const item of groupItems) {
      // Use participant name (item.user) when available, else fall back to payer
      if (!playerInfo.firstName) {
        const person = item.user ?? item.payer
        if (person) {
          playerInfo.firstName = person.firstName
          playerInfo.lastName = person.lastName
        }
      }

      // Track earliest registration date
      if (item.order?.date) {
        const itemDate = new Date(item.order.date)
        if (!earliestDate || itemDate < earliestDate) {
          earliestDate = itemDate
          playerInfo.date = item.order.date
        }
      }

      // Collect all categories from all orders for this participant
      const categoryId = matchCategory(item.name)
      if (categoryId && !playerInfo.categories.includes(categoryId)) {
        playerInfo.categories.push(categoryId)
      }

      // Extract custom fields from any item that has them
      // Works with both: new format (fields on each product) and old format (separate "informations complémentaires" product)
      if (item.customFields) {
        for (const field of item.customFields) {
          const fieldName = field.name.toLowerCase().trim()
          const answer = field.answer?.trim() || ''

          // Only update if we don't have the info yet (first item wins)
          if ((fieldName.includes('licence') || fieldName.includes('license')) && !playerInfo.licenseNumber) {
            playerInfo.licenseNumber = cleanLicenseNumber(answer)
          } else if (fieldName.includes('club') && !playerInfo.club) {
            // Normalize club name to uppercase for consistent grouping in stats
            playerInfo.club = answer ? answer.toUpperCase().trim() : null
          } else if (fieldName.includes('points') && playerInfo.officialPoints === null) {
            const points = parseInt(answer, 10)
            playerInfo.officialPoints = isNaN(points) ? null : points
          }
        }
      }
    }

    if (playerInfo.categories.length > 0 && playerInfo.firstName) {
      // Hash the grouping key as the player ID — never store raw email or license as ID
      const playerId = await hashEmail(key)

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

  return `Refreshed ${players.length} players`
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(refreshCache(env))
  },
}
