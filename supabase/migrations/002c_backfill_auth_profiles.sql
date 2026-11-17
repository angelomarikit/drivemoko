-- Drive Moko — 002c backfill profiles for existing Auth users
-- Run when login works but app says "Profile not found."
-- Typical cause: user created in Dashboard *before* trigger on_auth_user_created existed.

insert into public.profiles (id, role, full_name, email, phone, address, title)
select
  u.id,
  'customer'::public.app_role,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1), ''),
  coalesce(lower(trim(u.email)), ''),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(u.raw_user_meta_data ->> 'address', ''),
  coalesce(u.raw_user_meta_data ->> 'title', 'Customer')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
  and u.email is not null;

-- Promote admin (edit email if needed)
update public.profiles
set
  role = 'admin',
  title = 'Administrator',
  full_name = coalesce(nullif(full_name, ''), 'Drive Moko Admin')
where lower(email) = lower('admin@drivemoko.com');

-- Verification
select u.id, u.email, p.id as profile_id, p.role
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;