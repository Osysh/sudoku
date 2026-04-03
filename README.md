# Sudoky

Sudoky is a local-first Sudoku app built with Next.js + React and Supabase auth/database. 

## Features

- Email/password authentication with required unique username at sign-up
- Home page with 3 Sudoku difficulty levels (easy, medium, hard) in 9x9 format
- In-game timer
- Pause/resume controls
- "Leave game (pause)" behavior with browser-local saved progress
- Score submission after a solved Sudoku
- Leaderboard ranked by points then completion time (username only, no email exposed)

## Scoring

Each solved game gives points based on:

1. Difficulty (`easy`, `medium`, `hard`)
2. Completion time (seconds)

Current formula (in code):

- Base points: easy `600`, medium `1000`, hard `1500`
- Time penalty: `2` points per second
- Minimum score: `100`

## Stack

- Next.js (App Router)
- React
- TypeScript
- Supabase (`@supabase/supabase-js`)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Add env vars:

```bash
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Create DB table and policies in Supabase SQL editor:

- Run [`supabase/schema.sql`](/Users/maximeabylon/Movies/sudoky/supabase/schema.sql)

4. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/login`: authentication page
- `/`: home page (difficulty selection + resume saved game)
- `/game?difficulty=easy|medium|hard`: Sudoku game
- `/leaderboard`: scores ranking

## Notes

- Saved game state is stored in browser `localStorage` under `sudoky-active-game`.
- The leaderboard uses Supabase table `public.scores`.

## GitHub Pages Deploy

This project is configured for static export + GitHub Pages:

- Next config: [`next.config.ts`](/Users/maximeabylon/Movies/sudoky/next.config.ts)
- Workflow: [`.github/workflows/deploy-pages.yml`](/Users/maximeabylon/Movies/sudoky/.github/workflows/deploy-pages.yml)

Steps:

1. Push your repo to GitHub (default branch `main`).
2. In GitHub repo settings:
   - `Settings` -> `Pages` -> `Build and deployment` -> `Source: GitHub Actions`.
3. In `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase Auth settings, add your Pages URLs to allowed redirects, for example:
   - `https://<your-user>.github.io/<your-repo>/`
   - `https://<your-user>.github.io/<your-repo>/login/`
5. Push to `main`. The workflow will build and deploy automatically.

Notes:

- `NEXT_PUBLIC_BASE_PATH` is injected automatically in CI as `/<repo-name>`.
- Output is static (`out/`) and published by GitHub Pages.

new local version: 
```
docker compose -f supabase/docker-compose.yml up
```

Init 
cp supabase/.env.example supabase/.env

Access Supabase Studio on `http://localhost:8000` with credentials from `supabase/.env`.

App schema auto-init behavior (self-hosted Docker):
- `supabase/docker-compose.yml` mounts `./init.sql`
  into `/docker-entrypoint-initdb.d/init-scripts/100-sudoky-init.sql`.
- This SQL runs automatically only when `supabase/volumes/db/data` (PGDATA) is empty.
- Restarting containers with existing PGDATA does not re-run init scripts.

Optional seed behavior:
- `supabase/seed.sql` is separated from schema init.
- In `supabase/docker-compose.yml`, the seed mount is commented by default:
  - `# - ./seed.sql:/docker-entrypoint-initdb.d/init-scripts/110-sudoky-seed.sql:Z`
- Uncomment it for local/dev demos.
- Keep it commented for production environments.

Force re-init from scratch:
```bash
docker compose -f supabase/docker-compose.yml down
rm -rf supabase/volumes/db/data
docker compose -f supabase/docker-compose.yml up
```


https://supabase.com/docs/guides/local-development/overview

## Supabase CLI quick commands

Show help:
```bash
npx supabase --help
```

Common local-dev commands:
```bash
npx supabase init
npx supabase start
npx supabase status
npx supabase stop
npx supabase db --help
npx supabase migration --help
npx supabase seed --help
npx supabase services
```

Use Supabase CLI credentials in app `.env.local`:
```bash
cp .env.example .env.local
npx supabase start
npx supabase status -o env
```

Then copy these values from the `status -o env` output into `.env.local`:
- `API_URL` -> `NEXT_PUBLIC_SUPABASE_URL`
- `ANON_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Example:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY_FROM_SUPABASE_STATUS>
```

Create and apply a new init migration with Supabase CLI:
```bash
# If `supabase` is not globally installed, use npx.
# `supabase migration new init` -> zsh: command not found: supabase
npx supabase migration new init

# Reset local DB and apply migrations from supabase/migrations
npx supabase db reset
```

Expected output notes:
- `Created new migration at supabase/migrations/<timestamp>_init.sql`
- `Applying migration <timestamp>_init.sql...`
- `NOTICE: extension "pgcrypto" already exists, skipping` is normal.
- `WARN: no files matched pattern: supabase/seed.sql` means `db.seed.sql_paths` in `supabase/config.toml` points to a file that does not exist at that path.
  - If your seed is at `supabase/seed.sql`, set:
    - `[db.seed]`
    - `sql_paths = ["./seed.sql"]`
