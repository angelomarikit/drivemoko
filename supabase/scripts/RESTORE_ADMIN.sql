-- =============================================================================
-- Restore admin@drivemoko.com after RESET_ALL_DATA.sql
-- =============================================================================
-- STEP 1 (Dashboard, not SQL):
--   Authentication → Users → Add user
--   Email: admin@drivemoko.com
--   Password: (choose a strong password)
--   Auto Confirm User: ON
--
-- STEP 2: Run this script in SQL Editor.
-- =============================================================================

-- Ensure profile row exists (Dashboard users created after migration 002 usually get this via trigger)
insert into public.profiles (id, role, full_name, email, phone, address, title)
select
  u.id,
  'customer'::public.app_role,
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Drive Moko Admin'),
  lower(trim(u.email)),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(u.raw_user_meta_data ->> 'address', ''),
  'Customer'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
  and lower(u.email) = lower('admin@drivemoko.com');

-- Promote to administrator
update public.profiles
set
  role = 'admin'::public.app_role,
  title = 'Administrator',
  full_name = coalesce(nullif(trim(full_name), ''), 'Drive Moko Admin'),
  status = 'active'::public.account_status
where lower(email) = lower('admin@drivemoko.com');

-- Optional: mirror in user_roles (if your project uses it)
insert into public.user_roles (user_id, role, granted_by)
select p.id, 'admin'::public.app_role, p.id
from public.profiles p
where lower(p.email) = lower('admin@drivemoko.com')
on conflict (user_id, role) do nothing;

-- Verify
select u.id, u.email, u.email_confirmed_at is not null as confirmed, p.role, p.title
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('admin@drivemoko.com');