# Feature Specification: Tournament Registration Display Platform

**Feature Branch**: `001-tournament-registration`
**Created**: 2026-01-22
**Status**: Draft
**Input**: User description: "Plateforme web temps réel pour afficher les inscriptions d'un tournoi de tennis de table, organisées par tableaux de classement, avec enrichissement automatique des données clubs et points officiels via les numéros de licence."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Registrations by Category (Priority: P1)

As a visitor (player, parent, or organizer), I want to view all registered players organized by
their rating category so that I can quickly see who is participating in each bracket.

**Why this priority**: This is the core functionality of the platform. Without the ability to
view registrations by category, the platform has no value. Every other feature builds upon this
foundational capability.

**Independent Test**: Can be fully tested by navigating to the main page and verifying that
players appear in their chosen categories with their information (name, club, official points).
Delivers immediate value by providing tournament visibility.

**Acceptance Scenarios**:

1. **Given** players have registered via HelloAsso and selected their categories, **When** a
   visitor opens the main page, **Then** they see all 6 categories displayed with player counts.

2. **Given** a category has registered players, **When** a visitor views that category,
   **Then** they see a table with player name, club name, official points, and registration date.

3. **Given** a player registered for multiple categories on HelloAsso, **When** a visitor
   views the tables, **Then** the player appears in each category they selected.

4. **Given** the HelloAsso API contains registration data, **When** the page loads,
   **Then** the data appears within 2 seconds.

5. **Given** a visitor is on mobile, **When** they view the registration tables,
   **Then** the display adapts responsively to their screen size.

---

### User Story 2 - Sort and Navigate Player Tables (Priority: P2)

As a visitor, I want to sort the player tables by different columns (name, club, registration
date) so that I can find specific players or clubs quickly.

**Why this priority**: Once users can view data, they need to navigate it efficiently. This
enhances usability significantly for tournaments with many participants.

**Independent Test**: Can be tested by clicking column headers and verifying sort order changes.
Delivers value by making large player lists manageable.

**Acceptance Scenarios**:

1. **Given** a category table with multiple players, **When** I click the "Name" column header,
   **Then** the table sorts alphabetically by last name (A-Z, then Z-A on second click).

2. **Given** a category table, **When** I click the "Club" column header,
   **Then** the table sorts alphabetically by club name.

3. **Given** a category table, **When** I click the "Registration Date" column header,
   **Then** the table sorts by date (newest first, then oldest first on second click).

---

### User Story 3 - View Tournament Statistics (Priority: P3)

As an organizer, I want to see aggregate statistics about registrations so that I can monitor
tournament popularity, club participation, and registration trends.

**Why this priority**: Statistics provide value for planning and communication but are not
essential for basic tournament visibility. The platform is useful without them.

**Independent Test**: Can be tested by navigating to the stats page and verifying charts and
counters display correctly. Delivers value for organizers and sponsors.

**Acceptance Scenarios**:

1. **Given** registrations exist, **When** I navigate to the statistics page,
   **Then** I see total registration count and breakdown by category.

2. **Given** multiple clubs have registered players, **When** I view the statistics page,
   **Then** I see a chart showing the top 10 clubs by player count.

3. **Given** registrations span multiple days, **When** I view the statistics page,
   **Then** I see a timeline chart showing registrations per day.

---

### User Story 4 - Manual Data Refresh (Priority: P4)

As an organizer, I want to manually refresh the registration data so that I can see the latest
registrations without waiting for the automatic cache refresh.

**Why this priority**: Automatic caching handles most cases, but organizers occasionally need
immediate updates (e.g., during active registration periods). Lower priority because the
10-minute cache is usually sufficient.

**Independent Test**: Can be tested by clicking the refresh button and verifying new data
appears and the timestamp updates.

**Acceptance Scenarios**:

1. **Given** the page displays cached data, **When** I click the "Refresh" button,
   **Then** the system fetches fresh data from HelloAsso and updates the display.

2. **Given** I trigger a refresh, **When** the refresh completes,
   **Then** I see an updated "last updated" timestamp.

3. **Given** I click refresh, **When** a refresh is already in progress,
   **Then** the button is disabled to prevent duplicate requests.

---

### Edge Cases

- What happens when HelloAsso API is unavailable?
  - System displays last cached data with a warning message indicating stale data

- What happens when FFTT enrichment fails for a player?
  - Player is displayed with available data; club shows "Club inconnu", points show "N/A"

- What happens when a category has zero registrations?
  - Category section displays with "Aucune inscription" message

- What happens when the user refreshes during ongoing data fetch?
  - Refresh button is disabled; existing request completes

- What happens when HelloAsso returns malformed data?
  - System logs error, skips invalid entries, displays valid entries with error indicator

- What happens on very slow mobile connections?
  - Loading skeleton displayed; graceful timeout with retry option

## Requirements *(mandatory)*

### Functional Requirements

**Data Retrieval & Display**

- **FR-001**: System MUST retrieve player registrations from HelloAsso API using OAuth2
  Client Credentials authentication.

- **FR-002**: System MUST parse registration data to extract: player name, email, license
  number, and selected categories from HelloAsso products (players choose which categories
  to participate in).

- **FR-003**: System MUST enrich player data with club name and official start-of-season
  points by querying the FFTT system using the license number.

- **FR-004**: System MUST display players organized into 6 categories: 500-799, 500-999,
  500-1199, 500-1399, 500-1799, and TC Féminin.

- **FR-005**: System MUST show for each player: first name, last name, club name, official
  points, and registration date.

- **FR-006**: System MUST display a count of registered players per category.

**Sorting & Navigation**

- **FR-007**: System MUST allow sorting player tables by: last name, first name, club,
  and registration date.

- **FR-008**: System MUST provide clear visual feedback for current sort column and direction.

**Statistics**

- **FR-009**: System MUST display total registration count across all categories.

- **FR-010**: System MUST display a pie chart showing distribution by category.

- **FR-011**: System MUST display a bar chart showing top 10 clubs by player count.

- **FR-012**: System MUST display a line chart showing registrations over time.

**Caching & Performance**

- **FR-013**: System MUST cache registration data with a 10-minute TTL (configurable).

- **FR-014**: System MUST cache FFTT club data with a 24-hour TTL (stable data).

- **FR-015**: System MUST provide a manual refresh mechanism to invalidate cache on demand.

- **FR-016**: System MUST display "last updated" timestamp showing cache freshness.

**Error Handling & Fallbacks**

- **FR-017**: System MUST display graceful error messages when APIs are unavailable.

- **FR-018**: System MUST show last cached data when fresh data cannot be retrieved.

- **FR-019**: System MUST display players even when FFTT enrichment fails (partial data).

**Responsive Design**

- **FR-020**: System MUST be fully functional on mobile devices (320px minimum width).

- **FR-021**: System MUST provide touch-friendly interaction targets (minimum 44px).

### Key Entities

- **Player**: A registered tournament participant. Attributes: unique ID (from HelloAsso),
  first name, last name, license number, club name (from FFTT), club code, official points
  (start-of-season points from FFTT), selected categories (chosen by player on HelloAsso),
  registration date, email (optional).

- **Category**: A tournament bracket. Attributes: name/label, point range, player count.
  The 6 predefined categories are chosen by players during HelloAsso registration.
  A player can register for multiple categories.

- **Tournament Statistics**: Aggregate data about registrations. Attributes: total players,
  breakdown by category, breakdown by club, registration timeline, last update timestamp.

- **Club**: A table tennis club. Attributes: name, code (from FFTT). Enriched via license lookup.

## Assumptions

The following reasonable defaults have been assumed:

1. **Authentication**: No user login required; the platform is read-only and publicly accessible.

2. **Data Source**: HelloAsso is the single source of truth for registrations. Players register
   via HelloAsso forms, not through this platform.

3. **Category Selection**: Players choose which categories to participate in during HelloAsso
   registration (each product/ticket corresponds to a category). A player can register for
   multiple categories.

4. **License Number Format**: French FFTT license numbers follow a standard format that can be
   validated and used for lookups.

5. **Refresh Behavior**: Manual refresh invalidates cache and fetches fresh data; no polling or
   WebSocket push is implemented (initial version).

6. **Accessibility**: WCAG AA compliance for color contrast; ARIA labels for interactive elements.

7. **Browser Support**: Modern browsers (last 2 versions of Chrome, Firefox, Safari, Edge).

8. **Rate Limits**: HelloAsso (1000 req/hour) and FFTT rate limits will not be exceeded under
   normal usage patterns.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Page initial load completes within 2 seconds on standard broadband connections.

- **SC-002**: 100% of registered players are displayed with correct category assignment.

- **SC-003**: 95% of players display enriched data (club name and official points) from FFTT
  (allowing for lookup failures).

- **SC-004**: Users can sort any table column within 200ms response time.

- **SC-005**: Mobile users can view all information without horizontal scrolling on 320px screens.

- **SC-006**: System remains functional when HelloAsso API is temporarily unavailable (shows
  cached data).

- **SC-007**: Statistics page loads within 1 second when data is cached.

- **SC-008**: Manual refresh completes within 5 seconds under normal API conditions.

- **SC-009**: Zero credentials exposed in client-side code or browser network requests.

- **SC-010**: All interactive elements meet WCAG AA contrast requirements (4.5:1 ratio).
