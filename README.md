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


## Features/améliorations to implement

### ASAP
- solve points count: define scale mixing level difficulty + time 
- somewhere keep track of best time in each level
- personnaliser l'email d'insciption

### Style
- create new background themes
    - amytis léopard
    - maxime bateau, musique
    - soso rose
- change button for background
- hide game when pause 

### Gamification
- rooms for players with the same game -> timing competition
- mode "contre la montre" with given time -> +1000 points if successful 

### Other
- in Data base: link user id etc, add display name in authent DB
- contact page for issues
- include checkbox with/without help 
- availability of game in french, german, english, japanese
- printable versions in pdf with choice of diffulty levels (mix, or only 1 level)
- mobile app
- son victoire ou playlist intégrée
- trophées pour 
- version offline qui se remet à jour sur l'app dès que reconnecté au wifi
- option d'annoter dans coin case (?)
- snapshot of intermediate version, possibility to come back to a previous version