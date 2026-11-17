-- Drive Moko — 004 availability blocks (maintenance / owner blocks)
-- Requires: 003_vehicles.sql

create table public.vehicle_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  start_time time not null default '00:00',
  end_time time not null default '23:59',
  reason text not null default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint vehicle_availability_blocks_dates check (end_date >= start_date)
);

create index vehicle_availability_blocks_vehicle_dates_idx
  on public.vehicle_availability_blocks (vehicle_id, start_date, end_date);

create table public.vehicle_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  block_id uuid references public.vehicle_availability_blocks (id) on delete set null,
  service_type text not null,
  cost_centavos bigint check (cost_centavos is null or cost_centavos >= 0),
  odometer_km integer,
  notes text,
  serviced_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Verification
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('vehicle_availability_blocks', 'vehicle_maintenance_records');