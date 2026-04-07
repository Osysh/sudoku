-- Expand allowed difficulty values to support two additional tiers.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'scores_difficulty_check'
      and conrelid = 'public.scores'::regclass
  ) then
    alter table public.scores
      drop constraint scores_difficulty_check;
  end if;

  alter table public.scores
    add constraint scores_difficulty_check
    check (difficulty in ('easy', 'medium', 'difficult', 'hard', 'extrem'));
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'daily_challenges_difficulty_check'
      and conrelid = 'public.daily_challenges'::regclass
  ) then
    alter table public.daily_challenges
      drop constraint daily_challenges_difficulty_check;
  end if;

  alter table public.daily_challenges
    add constraint daily_challenges_difficulty_check
    check (difficulty in ('easy', 'medium', 'difficult', 'hard', 'extrem'));
end;
$$;
