-- Update existing RLS policies to use `(select auth.uid())`
-- to avoid per-row re-evaluation warnings.

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'users insert own profile'
  ) then
    alter policy "users insert own profile"
      on public.profiles
      with check ((select auth.uid()) = user_id);
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'users update own profile'
  ) then
    alter policy "users update own profile"
      on public.profiles
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scores'
      and policyname = 'users insert own score'
  ) then
    alter policy "users insert own score"
      on public.scores
      with check ((select auth.uid()) = user_id);
  end if;
end;
$$;
