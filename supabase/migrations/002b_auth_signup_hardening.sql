-- Drive Moko — 002b auth signup hardening (run after 002)
-- Public sign-up must always create a Customer profile (no role from browser metadata).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    full_name,
    email,
    phone,
    address,
    title
  )
  values (
    new.id,
    'customer'::public.app_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(lower(new.email), ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'address', ''),
    coalesce(new.raw_user_meta_data ->> 'title', 'Customer')
  );
  return new;
end;
$$;

-- Verification: function body should reference 'customer'::public.app_role only.
select prosrc like '%customer%' as customer_only_role
from pg_proc
where proname = 'handle_new_user';