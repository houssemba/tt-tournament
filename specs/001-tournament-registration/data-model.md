# Data Model: Tournament Registration Display

**Feature**: 001-tournament-registration
**Date**: 2026-01-22

## Entities

### Player

A registered tournament participant with enriched club and points information.

```typescript
interface Player {
  /** Unique identifier (license number) */
  id: string

  /** Player's first name from HelloAsso payer */
  firstName: string

  /** Player's last name from HelloAsso payer */
  lastName: string

  /** FFTT license number from HelloAsso custom field */
  licenseNumber: string

  /** Club name enriched from FFTT API, "Club inconnu" if lookup fails */
  club: string

  /** Club code from FFTT (e.g., "12345678"), null if lookup fails */
  clubCode: string | null

  /** Official start-of-season points from FFTT API, null if lookup fails */
  officialPoints: number | null

  /** List of categories the player registered for (chosen on HelloAsso) */
  categories: CategoryId[]

  /** Registration timestamp from HelloAsso order date */
  registrationDate: string  // ISO 8601 format

  /** Optional email from HelloAsso payer */
  email?: string
}
```

**Note**: A player can register for multiple categories on HelloAsso. The `categories`
array contains all the categories they chose to participate in.

**Validation Rules**:
- `id`: Required, equals licenseNumber (unique per player)
- `firstName`: Required, non-empty, trimmed
- `lastName`: Required, non-empty, trimmed
- `licenseNumber`: Required, 6-7 digit string, validated format
- `club`: Required, defaults to "Club inconnu" on enrichment failure
- `officialPoints`: Nullable, integer >= 500 when present
- `categories`: Required, non-empty array of valid CategoryId
- `registrationDate`: Required, valid ISO 8601 date

**Source Mapping**:
| Field | HelloAsso Source | FFTT Source |
|-------|------------------|-------------|
| id | `licenseNumber` | - |
| firstName | `order.payer.firstName` | - |
| lastName | `order.payer.lastName` | - |
| licenseNumber | `item.customFields["Numéro de licence"]` | - |
| club | - | `joueur.club` |
| clubCode | - | `joueur.nclub` |
| officialPoints | - | `joueur.clast` (classement) |
| categories | `items[].name` (all selected products) | - |
| registrationDate | `order.date` | - |
| email | `order.payer.email` | - |

---

### Category

A tournament rating bracket grouping players.

```typescript
interface Category {
  /** Unique category identifier */
  id: CategoryId

  /** Display label for UI */
  label: string

  /** Regex pattern to match HelloAsso product names */
  pattern: RegExp

  /** Sort order for display (lower = first) */
  sortOrder: number
}

type CategoryId =
  | '500-799'
  | '500-999'
  | '500-1199'
  | '500-1399'
  | '500-1799'
  | 'tc-feminin'
```

**Predefined Categories** (constant, not persisted):

| ID | Label | Pattern | Sort Order |
|----|-------|---------|------------|
| `500-799` | Tableau 500-799 | `/500[-\s]?799/i` | 1 |
| `500-999` | Tableau 500-999 | `/500[-\s]?999/i` | 2 |
| `500-1199` | Tableau 500-1199 | `/500[-\s]?1199/i` | 3 |
| `500-1399` | Tableau 500-1399 | `/500[-\s]?1399/i` | 4 |
| `500-1799` | Tableau 500-1799 | `/500[-\s]?1799/i` | 5 |
| `tc-feminin` | TC Féminin | `/f[ée]minin\|tc\s*f/i` | 6 |

---

### TournamentStats

Aggregate statistics computed from player data.

```typescript
interface TournamentStats {
  /** Total number of registered players */
  totalPlayers: number

  /** Player count per category */
  byCategory: Record<CategoryId, number>

  /** Top clubs by player count (sorted descending) */
  byClub: ClubCount[]

  /** Daily registration counts for timeline chart */
  registrationTimeline: DailyCount[]

  /** Timestamp of statistics computation */
  computedAt: string  // ISO 8601
}

interface ClubCount {
  club: string
  count: number
}

interface DailyCount {
  date: string  // YYYY-MM-DD
  count: number
}
```

**Computation Rules**:
- `totalPlayers`: Count of all Player entities
- `byCategory`: Group players by `category`, count each group
- `byClub`: Group players by `club`, count, sort descending, take top 10
- `registrationTimeline`: Group players by `registrationDate` (date only), count

---

### PlayersResponse

API response wrapper for player data.

```typescript
interface PlayersResponse {
  /** List of all registered players */
  players: Player[]

  /** Timestamp of last data fetch from HelloAsso */
  lastFetch: string  // ISO 8601

  /** Whether data is from cache (true) or fresh fetch (false) */
  fromCache: boolean

  /** Warning message if data is stale or incomplete */
  warning?: string
}
```

---

### StatsResponse

API response wrapper for statistics.

```typescript
interface StatsResponse {
  /** Computed tournament statistics */
  stats: TournamentStats

  /** Whether stats are from cache */
  fromCache: boolean
}
```

---

### RefreshResponse

API response for manual refresh operation.

```typescript
interface RefreshResponse {
  /** Whether refresh was successful */
  success: boolean

  /** New player count after refresh */
  playerCount: number

  /** Timestamp of refresh */
  refreshedAt: string  // ISO 8601

  /** Error message if refresh failed */
  error?: string
}
```

---

## Cache Structure

Data persisted in Cloudflare KV Store:

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `players:latest` | `PlayersResponse` | 600s | Full player list |
| `stats:latest` | `StatsResponse` | 600s | Computed statistics |
| `fftt:{license}` | `FFTTPlayerResult` | 86400s | Individual FFTT lookup |
| `last_fetch` | `string` | 600s | ISO timestamp |

```typescript
interface FFTTPlayerResult {
  club: string
  clubCode: string
  officialPoints: number | null
  found: boolean
}
```

---

## External API Types

### HelloAsso Order (Input)

```typescript
interface HelloAssoOrder {
  id: number
  date: string
  payer: {
    firstName: string
    lastName: string
    email: string
  }
  items: HelloAssoItem[]
}

interface HelloAssoItem {
  name: string
  customFields: HelloAssoCustomField[]
}

interface HelloAssoCustomField {
  name: string
  answer: string
}

interface HelloAssoPaginatedResponse<T> {
  data: T[]
  pagination: {
    pageIndex: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}
```

### FFTT Joueur (Input)

```typescript
interface FFTTJoueur {
  licence: string
  nom: string
  prenom: string
  club: string
  nclub: string
  clast: string  // classement
}
```

---

## Entity Relationships

```
┌─────────────────┐
│    Category     │
│  (predefined)   │
└────────┬────────┘
         │ 1
         │
         │ *
┌────────┴────────┐       enriches      ┌─────────────────┐
│     Player      │◄────────────────────│   FFTT Joueur   │
│ (from HelloAsso)│                     │   (external)    │
└────────┬────────┘                     └─────────────────┘
         │ *
         │
         │ computed
┌────────┴────────┐
│ TournamentStats │
│   (derived)     │
└─────────────────┘
```

---

## State Transitions

### Player Data Flow

```
HelloAsso API → Parse Orders → Match Categories → Enrich with FFTT → Cache → Serve
     │                                                │
     │                                                ▼
     │                                         [Cache Miss]
     │                                                │
     └────────────────────────────────────────────────┘
                           │
                           ▼
                    [Cache Hit]
                           │
                           ▼
                    Return Cached Data
```

### Cache States

| State | Condition | Behavior |
|-------|-----------|----------|
| Fresh | TTL not expired | Return cached data |
| Stale | TTL expired, API available | Fetch new, update cache |
| Degraded | TTL expired, API unavailable | Return stale + warning |
| Empty | No cache, API unavailable | Return error |
