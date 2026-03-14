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


## Features/améliorations to implement

### ASAP
- timer in minutes and not in seconds

### Sudoku grid layout
- larger numbers in the grid
- maybe: background each case in the sudoku alternated, instead of gray for given numbers 
- when you click on a number in the grid -> all the numbers in the sudoku are highlighted

### Style
- create new background themes
- change button name for background

### On main page
- rules of game (on main page)
- tips/strategies

### Other
- contact page for issues
- availability of game in french, german, english
- printable versions in pdf with choice of diffulty levels (mix, or only 1 level)