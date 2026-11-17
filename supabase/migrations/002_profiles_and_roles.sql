-- Drive Moko — 002 profiles and roles
-- Requires: 001_extensions_and_types.sql
-- Profiles extend auth.users; roles are server-controlled.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  title text not null default '',
  status public.account_status not null default 'active',
  license_number text,
  emergency_name text,
  emergency_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email))
);

create unique index profiles_email_unique on public.profiles (lower(email));

comment on column public.profiles.role is
  'Assigned by trusted server logic only; never client-writable in production.';

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.owner_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  business_name text,
  tax_id text,
  created_at timestamptz not null default now()
);

create table public.partner_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  share_rate_bps integer not null default 7000
    check (share_rate_bps >= 0 and share_rate_bps <= 10000),
  agreement_signed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.partner_profiles.share_rate_bps is
  'Partner commission in basis points (7000 = 70.00%).';

create table public.account_status_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  previous_status public.account_status,
  new_status public.account_status not null,
  reason text,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Sync profile on signup (customer self-register gets customer role)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.app_role,
      'customer'::public.app_role
    ),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(lower(new.email), ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Verification
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'user_roles', 'owner_profiles', 'partner_profiles')
order by table_name;