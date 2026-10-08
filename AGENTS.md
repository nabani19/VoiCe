# AGENTS.md — VoiCe

## Architecture
- **Frontend**: Static HTML/JS (`web/index.html`) served by Cloudflare Pages (`wrangler pages dev`)
- **AI Functions**: Cloudflare Pages Functions in `web/functions/api/` (TypeScript on workerd)
- **Data API**: Express + PostgreSQL (`web/data-api/server.js`) running on port 8080 inside Docker
- **Database**: PostgreSQL 16 (`db` service in docker-compose)

## Data Layer
- The app uses a **local PostgreSQL database** with the schema from `web/data-api/schema-local.sql` (adapted from `supabase/schema.sql` to work without Supabase Auth)
- A **demo user** (`00000000-0000-0000-0000-000000000001`) is auto-created; all data is scoped to this user
- The Express Data API (`web/data-api/server.js`) provides CRUD endpoints at `/data/*`
- A Pages Function proxy (`web/functions/api/data/[[route]].ts`) forwards `/api/data/*` requests to the Express API at `http://api:8080`
- The frontend `DataStore` object (in `index.html`) calls `/api/data/*` endpoints for favorites, conversations, streaks, and reports
- **Note**: `params.route` in the `[[route]]` catch-all is an array — must join with `/`

## Docker Compose Services
- `db`: PostgreSQL 16 Alpine (healthcheck: `pg_isready`)
- `api`: Node.js Express data API (healthcheck: `GET /health`)
- `web`: Wrangler pages dev on port 3000 (healthcheck: `GET /`)

## Key Quirks
- `node:22-slim` requires `ca-certificates` installed for workerd TLS — handled in the web service startup command
- Wrangler's `--proxy` flag serves index.html as SPA fallback; use a Pages Function proxy instead for API routing
- AI API keys are optional — the app falls back to a local neural engine (`replyEngine.js`) when external AI routes are unavailable
- All secrets are optional for local dev; placeholders are in `.env.base44-defaults`

## Verification
- `curl http://localhost:3000/api/data/favorites` — should return `{"favorites":[...]}`
- `curl -X POST http://localhost:3000/api/data/streak/checkin` — should return streak info
- `curl http://localhost:3000/` — should serve the VoiCe landing page
- `docker compose -f docker-compose.base44.yml ps` — all 3 services should be healthy
