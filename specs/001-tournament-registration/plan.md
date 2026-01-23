# Implementation Plan: Tournament Registration Display

**Branch**: `001-tournament-registration` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-tournament-registration/spec.md`

## Summary

Build a real-time web platform displaying table tennis tournament registrations organized by
rating categories, with automatic club enrichment via FFTT license lookups. The platform
fetches registration data from HelloAsso API, enriches player information with club details
from the FFTT Smartping API, and presents organized tables with sorting, statistics, and
manual refresh capabilities.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Framework**: Nuxt 3.x with SSR
**Primary Dependencies**: Nuxt 3, TailwindCSS, Headless UI, Chart.js
**Storage**: Cloudflare KV Store (caching only, no persistent database)
**Testing**: Vitest for unit tests, Playwright for E2E
**Target Platform**: Cloudflare Pages + Functions (edge deployment)
**Project Type**: Web application (unified Nuxt project with SSR)

**Performance Goals**:
- Initial page load < 2 seconds
- Sort operations < 200ms
- Statistics page < 1 second (cached)

**Constraints**:
- HelloAsso API rate limit: 1000 requests/hour
- FFTT Smartping API: requires authentication tokens
- Cloudflare Pages deployment only
- Mobile-first responsive design (320px minimum)

**Scale/Scope**:
- Expected: 50-200 players per tournament
- 6 categories
- Single tournament at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Implementation |
|-----------|-------------|--------|----------------|
| **I. Performance** | Load time < 2s | PASS | SSR + KV cache (10min TTL), edge functions |
| **I. Performance** | Intelligent caching | PASS | KV cache for players (10min), FFTT data (24h) |
| **II. Fiabilité** | API error handling | PASS | Fallbacks with cached data, graceful degradation |
| **II. Fiabilité** | Retry with backoff | PASS | Exponential backoff for transient errors |
| **III. Simplicité** | Intuitive navigation | PASS | Single page with category tabs, clear tables |
| **III. Simplicité** | Mobile-first | PASS | TailwindCSS responsive, touch-friendly (44px min) |
| **IV. Maintenabilité** | TypeScript strict | PASS | tsconfig strict mode, no `any` |
| **IV. Maintenabilité** | Modular architecture | PASS | Composables for API/cache/state separation |

**Technical Constraints**:

| Constraint | Requirement | Status | Implementation |
|------------|-------------|--------|----------------|
| Deployment | Cloudflare Pages | PASS | Nuxt 3 with nitro-cloudflare preset |
| Rate limits | Respect API quotas | PASS | Cache-first strategy, manual refresh throttle |
| Credentials | Environment variables | PASS | Cloudflare env vars, server-only access |
| Mobile | Compatibility | PASS | Responsive design, mobile-first approach |

**Out of Scope Verification**: No payments, no write operations, no auth, no tournament management.

## Project Structure

### Documentation (this feature)

```text
specs/001-tournament-registration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.yaml         # OpenAPI specification
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
pages/
├── index.vue                # Main page - registration tables by category
└── stats.vue                # Statistics dashboard

components/
├── PlayerTable.vue          # Sortable player table component
├── CategoryCard.vue         # Category section with header and count
├── StatsCard.vue            # Statistics metric card
├── ChartContainer.vue       # Chart wrapper (pie, bar, line)
├── RefreshButton.vue        # Manual refresh with loading state
├── LoadingSkeleton.vue      # Loading placeholder
└── ErrorBanner.vue          # Error message with fallback indicator

composables/
├── usePlayers.ts            # Player state management
├── useStats.ts              # Statistics computation
├── useSort.ts               # Table sorting logic
└── useRefresh.ts            # Manual refresh handling

server/
├── api/
│   ├── players.get.ts       # GET /api/players - fetch all registrations
│   ├── stats.get.ts         # GET /api/stats - aggregate statistics
│   └── refresh.post.ts      # POST /api/refresh - invalidate cache
└── utils/
    ├── helloasso.ts         # HelloAsso API client
    ├── fftt.ts              # FFTT Smartping API client
    ├── cache.ts             # Cloudflare KV helpers
    └── errors.ts            # Error handling utilities

types/
├── player.ts                # Player, Category types
├── helloasso.ts             # HelloAsso API response types
├── fftt.ts                  # FFTT API response types
└── stats.ts                 # Statistics types

utils/
├── formatters.ts            # Date, name formatting
├── validators.ts            # License number validation
└── constants.ts             # Categories, API endpoints

tests/
├── unit/
│   ├── formatters.test.ts
│   ├── validators.test.ts
│   └── useSort.test.ts
└── e2e/
    ├── home.spec.ts
    └── stats.spec.ts
```

**Structure Decision**: Unified Nuxt 3 project with SSR. Server routes handle API calls
and caching (credentials never exposed to client). Components are Vue SFCs with
TypeScript. Composables manage client-side state and reactivity.

## Complexity Tracking

No constitution violations. Architecture follows simplicity principle with:
- Single Nuxt project (no separate backend/frontend)
- Direct KV access (no ORM or repository pattern)
- Minimal dependencies (no state management library, Vue reactivity sufficient)
