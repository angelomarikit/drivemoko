-- Drive Moko — 002d allow signed-in users to read their own profile (Phase 2 login)
-- Safe to run if RLS is already on or off.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Verification
select relname, relrowsecurity
from pg_class
where relname = 'profiles';

select policyname, cmd, roles
from pg_policies
where tablename = 'profiles';