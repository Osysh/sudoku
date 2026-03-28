# Daily Challenge Feature Specification

## Goal
Introduce a daily Sudoku challenge that is pre-generated monthly, distributed by difficulty using a Gaussian distribution, and available to each user at local midnight.

This document defines the expected behavior, implementation boundaries, and rollout steps.

## Locked Product Decisions

### Difficulty Model
- Use existing difficulty levels only: `easy`, `medium`, `hard`.
- Daily challenge difficulties are not evenly distributed.
- Use Gaussian defaults:
  - `mu = 2.0` (centered on `medium`)
  - `sigma = 0.7`
  - clamp sampled values to `[1, 3]`
- Approximate expected distribution:
  - `easy ~21%`
  - `medium ~58%`
  - `hard ~21%`

### Puzzle Generation and Dedup
- Generate one daily challenge puzzle per calendar day.
- Generate exactly the number of days in the target month (28, 29, 30, or 31).
- No requirement to enforce unique-solution Sudoku.
- Deduplicate by exact puzzle only (not structural equivalence).

### Puzzle Storage Format
- Store puzzle as canonical 81-character string in row-major order.
- Use `0` for empty cells.
- Store a short indexed fingerprint for dedup lookup:
  - Use `sha256` hash (hex string) for reliability.
- Keep both:
  - canonical puzzle string for direct gameplay/debug
  - hash for fast dedup/indexing

### Availability and User Timezone
- Daily challenge should become available at `00:00` in the user-specific local timezone.
- Daily challenge completion state must be server-side and consistent across devices.

### Completion UX
- A user can complete the daily challenge only once for a given local day.
- After completion:
  - challenge CTA should disappear or show `already completed` for that day
  - user cannot reopen/restart the daily challenge for that day

### Leaderboard Policy
- No dedicated daily leaderboard.
- Daily completions are stored in the regular score flow with metadata:
  - `is_daily_challenge boolean not null default false`

### Monthly Schedule Generation
- Monthly generation runs on the 25th of each month for the next month.
- Month schedules are immutable once generated (no overwrite).
- If generation partially fails:
  - apply retry policy
  - emit a developer-facing failure message/alert

## Technical Scope (Implementation Intent)

### 1. Supabase Schema Changes
Extend `supabase/schema.sql` directly.

Add daily challenge core table(s), for example:
- `daily_challenges`
  - `id`
  - `challenge_date` (date key)
  - `difficulty` (`easy|medium|hard`)
  - `puzzle_canonical` (char/text length 81)
  - `puzzle_hash` (sha256 hex)
  - `created_at`
  - constraints/indexes:
    - unique on `challenge_date`
    - unique or indexed `puzzle_hash` for dedup

Add score metadata fields:
- `scores.is_daily_challenge boolean not null default false`
- optional linking column for traceability (`daily_challenge_id` or `challenge_date`)
- guard constraint so daily score rows always include required challenge reference
- uniqueness policy to prevent duplicate daily completion per user/day

Add RLS policies so authenticated users can:
- read the active daily challenge row they are eligible to play
- insert one daily completion score (enforced by constraints/policies)

### 2. Monthly Generator (Supabase)
Create SQL functions/procedures to:
1. determine next month bounds
2. sample difficulty for each day using Gaussian parameters
3. generate puzzle candidate per day
4. convert to canonical 81-char format
5. hash candidate (`sha256`)
6. deduplicate by exact hash against existing stored puzzles
7. insert immutable rows only if month not already generated

Add retry-capable wrapper procedure and execution logging.

### 3. Cron Configuration
Add a dedicated SQL setup note file (for example under `supabase/`) documenting:
- cron schedule expression for day 25
- target timezone for cron execution
- invocation of monthly generator function
- retry strategy and failure-notification hook

This is required in addition to schema updates.

### 4. Client App Behavior (Next.js)
Home page:
- fetch today’s daily challenge based on user local date key
- show CTA if not completed
- hide CTA or show `already completed` state when done

Game page:
- allow opening daily challenge only if not yet completed for that user/day
- block replay/open after completion
- on completion, save score with `is_daily_challenge = true` (+ challenge reference)

Cross-device consistency:
- completion status must be fetched from Supabase, not only localStorage

## Suggested Rollout Plan
1. Add schema tables/columns/indexes/constraints/RLS.
2. Add generator + dedup + immutable monthly schedule logic.
3. Add cron setup SQL documentation and retry/error logging.
4. Wire home UI daily CTA + completed state.
5. Wire gameplay guardrails and daily score submission metadata.
6. Validate timezone behavior at local midnight boundary.
7. Run end-to-end checks for month lengths and duplicate prevention.

## Non-Goals for This Iteration
- No daily-specific leaderboard page.
- No structural Sudoku equivalence dedup normalization.
- No server-rendered features (must stay static-export compatible).

## Platform Constraints
Must remain compatible with Next.js static export and GitHub Pages:
- no SSR requirements
- no API routes requiring Next.js server runtime
- client-side app logic with Supabase backend services
