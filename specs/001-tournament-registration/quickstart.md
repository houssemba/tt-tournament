# Quickstart: Tournament Registration Display

**Feature**: 001-tournament-registration
**Date**: 2026-01-22

## Prerequisites

- Node.js 18.x or later
- pnpm (recommended) or npm
- HelloAsso API credentials (client ID and secret)
- FFTT Smartping API credentials
- Cloudflare account (for deployment)

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd tournament-tt
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# HelloAsso API
HELLOASSO_CLIENT_ID=your_client_id
HELLOASSO_CLIENT_SECRET=your_client_secret
HELLOASSO_ORG_SLUG=your_organization_slug
HELLOASSO_FORM_SLUG=your_form_slug

# FFTT Smartping API
FFTT_API_SERIE=your_serie_number
FFTT_API_ID=your_api_id
FFTT_API_KEY=your_api_key

# Cache Configuration (optional)
CACHE_TTL=600  # 10 minutes default
```

### 3. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### 4. Local KV Emulation

NuxtHub automatically emulates Cloudflare KV in development. No additional setup required.

## Project Structure Overview

```
tournament-tt/
├── pages/
│   ├── index.vue          # Main registration display
│   └── stats.vue          # Statistics dashboard
├── components/            # Vue components
├── composables/           # Vue composables (state, logic)
├── server/
│   ├── api/               # API routes
│   └── utils/             # Server utilities
├── types/                 # TypeScript definitions
├── utils/                 # Shared utilities
└── tests/                 # Test files
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint` | Lint code |
| `pnpm typecheck` | Check TypeScript |

## Deployment to Cloudflare Pages

### 1. Connect Repository

1. Go to Cloudflare Dashboard → Pages
2. Create new project
3. Connect your Git repository
4. Select the branch to deploy

### 2. Build Configuration

| Setting | Value |
|---------|-------|
| Framework preset | Nuxt.js |
| Build command | `pnpm build` |
| Build output directory | `.output/public` |
| Root directory | `/` |

### 3. Environment Variables

Add the following environment variables in Cloudflare Pages settings:

- `HELLOASSO_CLIENT_ID`
- `HELLOASSO_CLIENT_SECRET`
- `HELLOASSO_ORG_SLUG`
- `HELLOASSO_FORM_SLUG`
- `FFTT_API_SERIE`
- `FFTT_API_ID`
- `FFTT_API_KEY`
- `CACHE_TTL` (optional)

### 4. KV Namespace

NuxtHub automatically provisions a KV namespace. Alternatively, manually bind:

1. Create KV namespace in Cloudflare Dashboard
2. Go to Pages project → Settings → Functions → KV bindings
3. Add binding: `KV` → your namespace

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/players` | GET | Get all registered players |
| `/api/stats` | GET | Get tournament statistics |
| `/api/refresh` | POST | Manually refresh cache |

## Verifying the Setup

### Check Players Endpoint

```bash
curl http://localhost:3000/api/players
```

Expected response:
```json
{
  "players": [...],
  "lastFetch": "2026-01-22T14:00:00Z",
  "fromCache": false
}
```

### Check Stats Endpoint

```bash
curl http://localhost:3000/api/stats
```

### Trigger Manual Refresh

```bash
curl -X POST http://localhost:3000/api/refresh
```

## Troubleshooting

### HelloAsso API Returns 401

- Verify `HELLOASSO_CLIENT_ID` and `HELLOASSO_CLIENT_SECRET`
- Check that credentials are for v5 API (not legacy v3)
- Ensure organization and form slugs are correct

### FFTT Enrichment Fails

- Players will show "Club inconnu" - this is expected fallback behavior
- Check FFTT API credentials and rate limits
- FFTT data is cached for 24 hours

### KV Not Working in Production

- Verify KV binding is configured in Cloudflare Pages settings
- Check that NuxtHub module is enabled in `nuxt.config.ts`
- Review Cloudflare Pages function logs for errors

### Page Loads Slowly

- First load after deployment is cold start (expected)
- Subsequent loads should use cached data
- Check Cloudflare Pages analytics for edge function timing

## Next Steps

1. Run the full test suite: `pnpm test`
2. Deploy to staging environment
3. Verify with real HelloAsso data
4. Monitor Cloudflare analytics for performance
