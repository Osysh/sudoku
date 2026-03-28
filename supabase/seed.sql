-- supabase/seed.sql
-- Idempotent local seed: demo auth user + profile + scores.

do $$
declare
  seed_user_id uuid;
  seed_email text := 'user@example.com';
  seed_password text := 'password';
  auth_token_col text;
begin
  select id into seed_user_id
  from auth.users
  where email = seed_email
  limit 1;

  if seed_user_id is null then
    seed_user_id := gen_random_uuid();

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = 'email_confirmed_at'
    ) then
      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) values (
        seed_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        seed_email,
        crypt(seed_password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        '{}'::jsonb,
        now(),
        now()
      );
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = 'confirmed_at'
    ) then
      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) values (
        seed_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        seed_email,
        crypt(seed_password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        '{}'::jsonb,
        now(),
        now()
      );
    else
      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) values (
        seed_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        seed_email,
        crypt(seed_password, gen_salt('bf')),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        '{}'::jsonb,
        now(),
        now()
      );
    end if;
  end if;

  -- Normalize nullable token-like columns expected as strings by some GoTrue versions.
  for auth_token_col in
    select unnest(array[
      'confirmation_token',
      'recovery_token',
      'email_change',
      'email_change_token_new',
      'email_change_token_current',
      'phone_change',
      'phone_change_token',
      'reauthentication_token'
    ])
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = auth_token_col
    ) then
      execute format(
        'update auth.users set %1$I = coalesce(%1$I, '''') where id = $1',
        auth_token_col
      )
      using seed_user_id;
    end if;
  end loop;

  insert into public.profiles (user_id, username)
  values (seed_user_id, 'username')
  on conflict (user_id) do update
    set username = excluded.username,
        updated_at = now();

  insert into public.scores (user_id, difficulty, completion_seconds, points)
  select seed_user_id, 'easy', 480, 600
  where not exists (
    select 1 from public.scores
    where user_id = seed_user_id
      and difficulty = 'easy'
      and completion_seconds = 480
      and points = 600
  );

  insert into public.scores (user_id, difficulty, completion_seconds, points)
  select seed_user_id, 'medium', 780, 900
  where not exists (
    select 1 from public.scores
    where user_id = seed_user_id
      and difficulty = 'medium'
      and completion_seconds = 780
      and points = 900
  );
end;
$$;
