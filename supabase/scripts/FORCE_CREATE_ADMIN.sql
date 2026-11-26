-- =============================================================================
-- FORCE CREATE admin@drivemoko.com (Auth user + profile) — run in SQL Editor
-- =============================================================================
-- Edit password below, then Run.
-- If login still fails, Auth → Users → delete this user and run again.
-- =============================================================================

create extension if not exists pgcrypto;

do $$
declare
  v_email text := 'admin@drivemoko.com';
  v_password text := 'ChangeMe-Admin-2026!';  -- <<< SET YOUR LOGIN PASSWORD
  v_user_id uuid := gen_random_uuid();         -- or fixed: 'a1111111-1111-4111-8111-111111111111'::uuid
  v_encrypted_pw text;
begin
  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  -- Remove old row (profiles cascade from auth.users)
  delete from auth.users where lower(email) = lower(v_email);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(v_email),
    v_encrypted_pw,
    now(),
  '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Drive Moko Admin'),
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    'email',
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email)),
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, role, full_name, email, phone, address, title, status)
  values (
    v_user_id,
    'admin'::public.app_role,
    'Drive Moko Admin',
    lower(v_email),
    '',
    '',
    'Administrator',
    'active'::public.account_status
  )
  on conflict (id) do update set
    role = 'admin'::public.app_role,
    title = 'Administrator',
    full_name = 'Drive Moko Admin',
    status = 'active'::public.account_status;

  raise notice 'Admin created. user_id = %, email = %', v_user_id, v_email;
end $$;

-- Verify
select u.id as user_uuid, u.email, u.email_confirmed_at is not null as can_login, p.role
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('admin@drivemoko.com');