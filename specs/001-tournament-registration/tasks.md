# Tasks: Tournament Registration Display

**Input**: Design documents from `/specs/001-tournament-registration/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.yaml, research.md, quickstart.md

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Nuxt 3 project**: Standard Nuxt structure at repository root
- pages/, components/, composables/, server/, types/, utils/

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Nuxt 3 configuration

- [ ] T001 Initialize Nuxt 3 project with `npx nuxi@latest init .` at repository root
- [ ] T002 Configure TypeScript strict mode in tsconfig.json
- [ ] T003 [P] Install dependencies: @nuxthub/core, tailwindcss, @headlessui/vue, chart.js, vue-chartjs
- [ ] T004 [P] Configure TailwindCSS with tailwind.config.ts and global styles in assets/css/main.css
- [ ] T005 [P] Configure nuxt.config.ts with NuxtHub, TailwindCSS modules, and nitro cloudflare-pages preset
- [ ] T006 [P] Create .env.example with required environment variables (HELLOASSO_*, FFTT_*, CACHE_TTL)
- [ ] T007 Create wrangler.toml for Cloudflare KV namespace binding

**Checkpoint**: Nuxt 3 project scaffolded and configured for Cloudflare Pages deployment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Type Definitions

- [ ] T008 [P] Create Player, Category, CategoryId types in types/player.ts
- [ ] T009 [P] Create HelloAssoOrder, HelloAssoItem, HelloAssoCustomField, HelloAssoPaginatedResponse types in types/helloasso.ts
- [ ] T010 [P] Create FFTTJoueur, FFTTPlayerResult types in types/fftt.ts
- [ ] T011 [P] Create TournamentStats, ClubCount, DailyCount, PlayersResponse, StatsResponse, RefreshResponse types in types/stats.ts

### Utilities and Constants

- [ ] T012 [P] Create CATEGORIES constant array with id, label, pattern, sortOrder in utils/constants.ts
- [ ] T013 [P] Create matchCategory function to map HelloAsso product names to CategoryId in utils/constants.ts
- [ ] T014 [P] Create validateLicenseNumber function (6-7 digits) in utils/validators.ts
- [ ] T015 [P] Create formatDate, formatPlayerName functions in utils/formatters.ts

### Server Utilities

- [ ] T016 Create ApiError class and withRetry helper with exponential backoff in server/utils/errors.ts
- [ ] T017 Create Cloudflare KV cache helpers (getFromCache, setInCache, deleteFromCache) in server/utils/cache.ts
- [ ] T018 Create HelloAsso OAuth2 client with token management and getOrders function in server/utils/helloasso.ts
- [ ] T019 Create FFTT Smartping API client with getPlayerByLicense function in server/utils/fftt.ts

**Checkpoint**: Foundation ready - all types defined, API clients ready, cache utilities available

---

## Phase 3: User Story 1 - View Registrations by Category (Priority: P1) MVP

**Goal**: Display all registered players organized by their chosen categories with enriched FFTT data (club, official points)

**Independent Test**: Navigate to main page, verify 6 categories displayed with player counts, each player shows name, club, points, registration date

### Server-Side Implementation

- [ ] T020 [US1] Implement GET /api/players endpoint in server/api/players.get.ts:
  - Fetch orders from HelloAsso API
  - Parse custom fields for license number
  - Extract categories from product names
  - Enrich with FFTT data (club, officialPoints) using parallel requests
  - Cache response in KV (10min TTL)
  - Return PlayersResponse with fromCache flag and optional warning

### Client-Side Composables

- [ ] T021 [US1] Create usePlayers composable in composables/usePlayers.ts:
  - Fetch players from /api/players
  - Group players by category
  - Expose players, playersByCategory, loading, error, lastFetch states

### UI Components

- [ ] T022 [P] [US1] Create LoadingSkeleton component in components/LoadingSkeleton.vue:
  - Animated placeholder for table rows
  - Configurable row count

- [ ] T023 [P] [US1] Create ErrorBanner component in components/ErrorBanner.vue:
  - Display error message with icon
  - Optional retry button
  - Warning variant for stale data

- [ ] T024 [US1] Create PlayerTable component in components/PlayerTable.vue:
  - Display player rows with: name, club, officialPoints, registrationDate
  - Handle empty state ("Aucune inscription")
  - Mobile-responsive table (horizontal scroll or card layout on small screens)
  - ARIA labels for accessibility

- [ ] T025 [US1] Create CategoryCard component in components/CategoryCard.vue:
  - Category header with label and player count badge
  - Collapsible/expandable section
  - Contains PlayerTable for that category

### Page Implementation

- [ ] T026 [US1] Create main page in pages/index.vue:
  - Use usePlayers composable
  - Display 6 CategoryCard components (one per category)
  - Show LoadingSkeleton while loading
  - Show ErrorBanner on error
  - Display "Dernière mise à jour" timestamp
  - Mobile-first responsive layout

**Checkpoint**: User Story 1 complete - visitors can view all registrations organized by category with enriched data

---

## Phase 4: User Story 2 - Sort and Navigate Player Tables (Priority: P2)

**Goal**: Enable sorting of player tables by name, club, points, and registration date

**Independent Test**: Click column headers, verify sort order changes (ascending/descending toggle)

### Sorting Logic

- [ ] T027 [US2] Create useSort composable in composables/useSort.ts:
  - Generic sorting for Player arrays
  - Support sort by: lastName, firstName, club, officialPoints, registrationDate
  - Track current sortKey and sortDirection (asc/desc)
  - Toggle direction on same column click

### UI Updates

- [ ] T028 [US2] Update PlayerTable component in components/PlayerTable.vue:
  - Add clickable column headers
  - Integrate useSort composable
  - Display sort indicator (arrow up/down) on active column
  - Touch-friendly header buttons (44px minimum)

**Checkpoint**: User Story 2 complete - users can sort tables by any column

---

## Phase 5: User Story 3 - View Tournament Statistics (Priority: P3)

**Goal**: Display aggregate statistics with charts showing category distribution, top clubs, and registration timeline

**Independent Test**: Navigate to /stats, verify total count, pie chart, bar chart, and line chart display correctly

### Server-Side Implementation

- [ ] T029 [US3] Implement GET /api/stats endpoint in server/api/stats.get.ts:
  - Fetch players (reuse cache from /api/players if available)
  - Compute totalPlayers, byCategory counts, byClub (top 10), registrationTimeline
  - Cache stats in KV (10min TTL)
  - Return StatsResponse

### Client-Side Composables

- [ ] T030 [US3] Create useStats composable in composables/useStats.ts:
  - Fetch stats from /api/stats
  - Expose stats, loading, error states

### UI Components

- [ ] T031 [P] [US3] Create StatsCard component in components/StatsCard.vue:
  - Display single metric with label and value
  - Optional trend indicator
  - Responsive sizing

- [ ] T032 [US3] Create ChartContainer component in components/ChartContainer.vue:
  - Wrapper for Chart.js charts
  - Register required Chart.js components (ArcElement, BarElement, LineElement, etc.)
  - Support pie, bar, line chart types via props
  - Responsive sizing with aspect ratio

### Page Implementation

- [ ] T033 [US3] Create statistics page in pages/stats.vue:
  - Use useStats composable
  - Display total players StatsCard
  - Display category breakdown pie chart
  - Display top 10 clubs bar chart
  - Display registration timeline line chart
  - Navigation link back to main page
  - Mobile-responsive grid layout

**Checkpoint**: User Story 3 complete - organizers can view comprehensive statistics

---

## Phase 6: User Story 4 - Manual Data Refresh (Priority: P4)

**Goal**: Allow manual cache invalidation and data refresh

**Independent Test**: Click refresh button, verify data updates and timestamp changes, verify button disabled during refresh

### Server-Side Implementation

- [ ] T034 [US4] Implement POST /api/refresh endpoint in server/api/refresh.post.ts:
  - Invalidate players and stats cache in KV
  - Fetch fresh data from HelloAsso
  - Re-enrich with FFTT data
  - Update cache
  - Rate limit (1 request per minute per client)
  - Return RefreshResponse with success/error

### Client-Side Composables

- [ ] T035 [US4] Create useRefresh composable in composables/useRefresh.ts:
  - Trigger POST /api/refresh
  - Track refreshing state
  - Handle rate limit errors
  - Emit refresh complete event

### UI Components

- [ ] T036 [US4] Create RefreshButton component in components/RefreshButton.vue:
  - Button with refresh icon
  - Loading spinner during refresh
  - Disabled state while refreshing
  - Toast/notification on success or rate limit error

### Page Integration

- [ ] T037 [US4] Update pages/index.vue to include RefreshButton:
  - Add RefreshButton in header area
  - Re-fetch players after successful refresh
  - Display rate limit message if triggered

**Checkpoint**: User Story 4 complete - organizers can manually refresh data

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Mobile & Responsiveness

- [ ] T038 [P] Verify and fix mobile layout in pages/index.vue for 320px minimum width
- [ ] T039 [P] Verify and fix mobile layout in pages/stats.vue for 320px minimum width
- [ ] T040 [P] Ensure all touch targets are minimum 44px in all interactive components

### Accessibility

- [ ] T041 [P] Add ARIA labels to all interactive elements in PlayerTable, CategoryCard, RefreshButton
- [ ] T042 [P] Verify WCAG AA color contrast (4.5:1 ratio) in TailwindCSS configuration

### Navigation & UX

- [ ] T043 Add navigation header component with links between index and stats pages
- [ ] T044 Add page titles and meta tags for SEO in pages/index.vue and pages/stats.vue

### Final Validation

- [ ] T045 Run quickstart.md validation scenarios manually
- [ ] T046 Verify Cloudflare Pages deployment with wrangler pages dev

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP, implement first
- **User Story 2 (Phase 4)**: Depends on US1 completion (needs PlayerTable)
- **User Story 3 (Phase 5)**: Depends on Foundational - can run parallel to US2
- **User Story 4 (Phase 6)**: Depends on US1 completion (needs usePlayers integration)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Setup (Phase 1)
     │
     ▼
Foundational (Phase 2)
     │
     ├─────────────────────────┐
     ▼                         ▼
US1 (Phase 3) ◄──────────  US3 (Phase 5)
     │                    [can run parallel]
     ├──────────┐
     ▼          ▼
US2 (Phase 4)  US4 (Phase 6)
     │          │
     └────┬─────┘
          ▼
   Polish (Phase 7)
```

### Within Each User Story

- Server endpoints before composables
- Composables before components
- Components before pages
- Tasks marked [P] within same phase can run in parallel

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006 can run in parallel
- **Phase 2**: T008-T011 (types) can run in parallel; T012-T015 (utils) can run in parallel
- **Phase 3**: T022, T023 can run in parallel (LoadingSkeleton, ErrorBanner)
- **Phase 5**: T031 can run parallel to T030
- **Phase 7**: T038-T042 can all run in parallel

---

## Parallel Execution Example: Phase 2

```bash
# Launch all type definitions together:
Task: "Create Player, Category, CategoryId types in types/player.ts"
Task: "Create HelloAssoOrder types in types/helloasso.ts"
Task: "Create FFTTJoueur types in types/fftt.ts"
Task: "Create TournamentStats types in types/stats.ts"

# Then launch all utilities together:
Task: "Create CATEGORIES constant in utils/constants.ts"
Task: "Create validateLicenseNumber in utils/validators.ts"
Task: "Create formatDate, formatPlayerName in utils/formatters.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently - can visitors see registrations by category?
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (MVP!)
3. Add User Story 2 → Test → Deploy (sorting)
4. Add User Story 3 → Test → Deploy (statistics)
5. Add User Story 4 → Test → Deploy (refresh)
6. Complete Polish → Final release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (critical path)
   - Developer B: User Story 3 (independent)
3. After US1 complete:
   - Developer A: User Story 2
   - Developer B: User Story 4
4. Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Player has `categories: CategoryId[]` (multiple categories per player)
- Player has `officialPoints: number | null` (from FFTT enrichment)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
