-- Drive Moko — 003 vehicles
-- Requires: 002_profiles_and_roles.sql

create table public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  code public.vehicle_category not null unique,
  label text not null,
  sort_order integer not null default 0
);

insert into public.vehicle_categories (code, label, sort_order) values
  ('SUV', 'SUV', 10),
  ('Sedan', 'Sedan', 20),
  ('MPV', 'MPV', 30),
  ('Van', 'Van', 40),
  ('Pickup', 'Pickup', 50),
  ('Others', 'Others', 99);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  model text not null,
  year integer not null check (year >= 1990 and year <= 2100),
  category public.vehicle_category not null,
  seats integer not null check (seats >= 1 and seats <= 99),
  transmission public.transmission not null,
  fuel public.fuel_type not null,
  price_per_day_centavos bigint not null check (price_per_day_centavos >= 0),
  listing_status public.listing_status not null default 'pending',
  listing_active boolean not null default true,
  owner_id uuid references public.profiles (id) on delete set null,
  partner_id uuid references public.profiles (id) on delete set null,
  description text not null default '',
  features jsonb not null default '[]'::jsonb,
  inclusions jsonb not null default '[]'::jsonb,
  plate_number text not null default '',
  offered_rental_types public.rental_type[] not null default '{self-drive}',
  airconditioning boolean not null default true,
  ownership_type public.ownership_type not null default 'owned',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_owner_id_idx on public.vehicles (owner_id) where deleted_at is null;
create index vehicles_partner_id_idx on public.vehicles (partner_id) where deleted_at is null;
create index vehicles_listing_idx on public.vehicles (listing_status, listing_active)
  where deleted_at is null;

create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index vehicle_images_vehicle_id_idx on public.vehicle_images (vehicle_id);

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  doc_type text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.vehicle_approval_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  previous_status public.listing_status,
  new_status public.listing_status not null,
  reason text,
  acted_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- Verification
select count(*) as vehicle_category_count from public.vehicle_categories;
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'vehicles'
  and column_name in ('price_per_day_centavos', 'listing_status');