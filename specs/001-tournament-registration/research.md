# Research: Tournament Registration Display

**Feature**: 001-tournament-registration
**Date**: 2026-01-22
**Status**: Complete

## 1. HelloAsso API Integration

### Decision
Use HelloAsso API v5 with OAuth2 Client Credentials flow for server-side authentication.

### Rationale
- v5 is the current maintained version (v3 deprecated)
- Client Credentials flow is appropriate for server-to-server communication
- Official Node.js SDK available but direct fetch is simpler for our needs

### API Details

**Authentication Endpoint**: `https://api.helloasso.com/oauth2/token`

```typescript
// Token request
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={HELLOASSO_CLIENT_ID}
&client_secret={HELLOASSO_CLIENT_SECRET}

// Response
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "..."
}
```

**Orders Endpoint**: `https://api.helloasso.com/v5/organizations/{orgSlug}/forms/Event/{formSlug}/orders`

```typescript
// Response structure (relevant fields)
{
  "data": [{
    "id": 12345,
    "date": "2026-01-15T10:30:00Z",
    "payer": {
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@email.com"
    },
    "items": [{
      "name": "Tableau 500-799",           // Category from product name
      "customFields": [{
        "name": "Numéro de licence",
        "answer": "123456"
      }]
    }]
  }],
  "pagination": {
    "pageIndex": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

### Alternatives Considered
- **HelloAsso Node SDK**: Adds dependency, abstracts too much for simple use case
- **Webhooks**: Would require persistent storage, over-engineered for read-only display

### Rate Limiting Strategy
- Cache responses for 10 minutes (configurable via `CACHE_TTL` env var)
- Single API call fetches all orders (pagination handled server-side)
- Manual refresh throttled to 1 request per minute per user

---

## 2. FFTT Smartping API Integration

### Decision
Use FFTT Smartping API v2.0 (`xml_liste_joueur_o.php` endpoint) for license-based club lookup.

### Rationale
- Official API documented by FFTT
- Supports lookup by license number directly
- Returns club information (number and name)

### API Details

**Endpoint**: `https://apiv2.fftt.com/mobile/pxml/xml_liste_joueur_o.php`

**Authentication**: Requires FFTT API credentials (serie, id, timestamp authentication)

```typescript
// Request
GET /mobile/pxml/xml_liste_joueur_o.php
?serie={API_SERIE}
&tm={TIMESTAMP}
&tmc={ENCRYPTED_TIMESTAMP}
&id={API_ID}
&licence={LICENSE_NUMBER}

// Response (XML)
<liste>
  <joueur>
    <licence>123456</licence>
    <nom>DUPONT</nom>
    <prenom>Jean</prenom>
    <club>Club TT Example</club>
    <nclub>12345678</nclub>
    <clast>789</clast>
  </joueur>
</liste>
```

### Alternatives Considered
- **Scraping FFTT website**: Fragile, against ToS, not recommended
- **Local database of clubs**: Would require manual maintenance, outdated quickly
- **No enrichment**: Acceptable fallback if API unavailable

### Caching Strategy
- Cache FFTT responses for 24 hours (club data rarely changes)
- Cache key: `fftt:licence:{licenseNumber}`
- Parallel enrichment for multiple players (Promise.allSettled)

### Fallback Behavior
If FFTT lookup fails:
1. Return player with `club: "Club inconnu"`
2. Log error for monitoring
3. Do not retry immediately (respect rate limits)

---

## 3. Cloudflare KV Store Integration

### Decision
Use Cloudflare KV via NuxtHub `hubKV()` composable for simplified binding management.

### Rationale
- NuxtHub handles KV binding automatically
- Works in development with `wrangler dev` proxy
- No manual binding configuration needed

### Implementation

```typescript
// server/utils/cache.ts
export async function getFromCache<T>(key: string): Promise<T | null> {
  const kv = hubKV()
  const data = await kv.get(key)
  return data ? JSON.parse(data) : null
}

export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const kv = hubKV()
  await kv.set(key, JSON.stringify(value), { ttl: ttlSeconds })
}
```

### Cache Keys
| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `players:latest` | 600s (10min) | Full player list with enrichment |
| `stats:latest` | 600s (10min) | Computed statistics |
| `fftt:{license}` | 86400s (24h) | Individual FFTT lookup result |
| `last_fetch` | 600s (10min) | Timestamp of last HelloAsso fetch |

### Alternatives Considered
- **Direct KV binding**: More setup, harder local development
- **In-memory cache**: Lost on cold start, insufficient for edge
- **Redis/Upstash**: External dependency, added cost and complexity

---

## 4. Nuxt 3 + Cloudflare Pages Deployment

### Decision
Use Nuxt 3 with `nitro-cloudflare-pages` preset and NuxtHub for KV management.

### Rationale
- Native Cloudflare Pages support via Nitro
- SSR works out of the box with edge functions
- NuxtHub simplifies KV and environment configuration

### Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxthub/core'],
  hub: {
    kv: true
  },
  nitro: {
    preset: 'cloudflare-pages'
  }
})
```

### Environment Variables (Cloudflare Dashboard)
```
HELLOASSO_CLIENT_ID=xxx
HELLOASSO_CLIENT_SECRET=xxx
HELLOASSO_ORG_SLUG=xxx
HELLOASSO_FORM_SLUG=xxx
FFTT_API_SERIE=xxx
FFTT_API_ID=xxx
FFTT_API_KEY=xxx
CACHE_TTL=600
```

### Deployment Flow
1. Push to GitHub main branch
2. Cloudflare Pages auto-builds via Nuxt preset
3. Environment variables from Cloudflare dashboard
4. KV namespace auto-provisioned by NuxtHub

---

## 5. Chart.js for Statistics

### Decision
Use Chart.js with vue-chartjs wrapper for reactive charts.

### Rationale
- Lightweight (~60KB gzipped)
- Vue integration available
- Supports all required chart types (pie, bar, line)

### Implementation

```typescript
// components/ChartContainer.vue
import { Pie, Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
)
```

### Alternatives Considered
- **Recharts**: React-specific, not Vue compatible
- **ApexCharts**: Heavier, more features than needed
- **D3.js**: Over-engineered for simple charts, steeper learning curve

---

## 6. Category Mapping Strategy

### Decision
Map HelloAsso product names to categories using pattern matching.

### Rationale
- Product names contain category identifiers
- Flexible to handle naming variations
- No external configuration needed

### Implementation

```typescript
// utils/constants.ts
export const CATEGORIES = [
  { id: '500-799', label: 'Tableau 500-799', pattern: /500[-\s]?799/i },
  { id: '500-999', label: 'Tableau 500-999', pattern: /500[-\s]?999/i },
  { id: '500-1199', label: 'Tableau 500-1199', pattern: /500[-\s]?1199/i },
  { id: '500-1399', label: 'Tableau 500-1399', pattern: /500[-\s]?1399/i },
  { id: '500-1799', label: 'Tableau 500-1799', pattern: /500[-\s]?1799/i },
  { id: 'tc-feminin', label: 'TC Féminin', pattern: /f[ée]minin|tc\s*f/i }
] as const

export type CategoryId = typeof CATEGORIES[number]['id']

export function matchCategory(productName: string): CategoryId | null {
  for (const cat of CATEGORIES) {
    if (cat.pattern.test(productName)) {
      return cat.id
    }
  }
  return null
}
```

---

## 7. Error Handling Strategy

### Decision
Implement layered error handling with graceful degradation.

### Layers

1. **API Client Level**: Retry transient errors (5xx, network) with exponential backoff
2. **Cache Level**: Return stale data if fresh fetch fails
3. **UI Level**: Show warning banner, never blank page

### Implementation

```typescript
// server/utils/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean
  ) {
    super(message)
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (error instanceof ApiError && !error.isRetryable) {
        throw error
      }
      await sleep(baseDelayMs * Math.pow(2, attempt))
    }
  }

  throw lastError
}
```

---

## Summary

All technical decisions align with constitution principles:

| Decision | Principle Alignment |
|----------|---------------------|
| KV caching (10min/24h) | Performance, Fiabilité |
| FFTT fallback display | Fiabilité |
| Nuxt 3 unified project | Simplicité, Maintenabilité |
| TypeScript strict | Maintenabilité |
| Chart.js (lightweight) | Performance, Simplicité |
| Environment variables | Contraintes Techniques (Credentials) |
| Cloudflare Pages | Contraintes Techniques (Déploiement) |

**Sources**:
- [HelloAsso API Documentation](https://dev.helloasso.com/)
- [FFTT Smartping API Specification](http://www.fftt.com/site/medias/shares_files/informatique-specifications-techniques-api-smartping-720.pdf)
- [Nuxt on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nuxt-site/)
- [NuxtHub KV Documentation](https://hub.nuxt.com/docs/features/kv)
