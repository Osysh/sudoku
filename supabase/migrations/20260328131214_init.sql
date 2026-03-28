-- Base init schema (no daily challenge objects).
-- Non-destructive: does not drop existing tables/data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create unique index if not exists profiles_username_lower_key
  on public.profiles ((lower(username)));
create unique index if not exists profiles_username_key
  on public.profiles (username);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  completion_seconds integer not null check (completion_seconds >= 0),
  points integer not null check (points >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles are readable'
  ) then
    create policy "profiles are readable"
      on public.profiles
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'users insert own profile'
  ) then
    create policy "users insert own profile"
      on public.profiles
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'users update own profile'
  ) then
    create policy "users update own profile"
      on public.profiles
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scores'
      and policyname = 'scores are readable'
  ) then
    create policy "scores are readable"
      on public.scores
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scores'
      and policyname = 'users insert own score'
  ) then
    create policy "users insert own score"
      on public.scores
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.scores to authenticated;
grant insert on public.scores to authenticated;
