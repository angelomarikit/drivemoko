-- Drive Moko — 005 bookings (with overlap prevention)
-- Requires: 004_availability.sql

create table public.booking_reference_counters (
  year integer primary key,
  last_value integer not null default 0
);

create or replace function public.next_booking_reference(p_year integer default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := coalesce(p_year, extract(year from timezone('Asia/Manila', now()))::integer);
  n integer;
begin
  insert into public.booking_reference_counters as c (year, last_value)
  values (y, 1)
  on conflict (year) do update
    set last_value = c.last_value + 1
  returning last_value into n;
  return format('DM-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  vehicle_id uuid not null references public.vehicles (id),
  customer_id uuid not null references public.profiles (id),
  pickup_location text not null default '',
  pickup_date date not null,
  return_date date not null,
  pickup_time time not null default '08:00',
  return_time time not null default '18:00',
  pickup_at timestamptz generated always as (
    (pickup_date + pickup_time) at time zone 'Asia/Manila'
  ) stored,
  return_at timestamptz generated always as (
    (return_date + return_time) at time zone 'Asia/Manila'
  ) stored,
  rental_type public.rental_type not null,
  addon_insurance boolean not null default false,
  addon_with_driver boolean not null default false,
  addon_child_seat boolean not null default false,
  special_request text not null default '',
  document_storage_path text,
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  -- pricing snapshot (centavos)
  price_days integer not null default 1 check (price_days >= 1),
  price_daily_rate_centavos bigint not null check (price_daily_rate_centavos >= 0),
  price_base_centavos bigint not null check (price_base_centavos >= 0),
  price_insurance_centavos bigint not null default 0,
  price_driver_centavos bigint not null default 0,
  price_child_seat_centavos bigint not null default 0,
  price_total_centavos bigint not null check (price_total_centavos >= 0),
  admin_notes text not null default '',
  blocks_calendar boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates check (return_date >= pickup_date),
  constraint bookings_time_range check (return_at > pickup_at)
);

create index bookings_vehicle_id_idx on public.bookings (vehicle_id);
create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_pickup_at_idx on public.bookings (pickup_at);

-- Non-overlapping confirmed rentals for the same vehicle (half-open interval [pickup, return))
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(pickup_at, return_at, '[)') with &&
  )
  where (
    blocks_calendar = true
    and status in ('pending', 'confirmed', 'ongoing')
    and deleted_at is null
  );

comment on constraint bookings_no_overlap on public.bookings is
  'Prevents double booking; pending included when blocks_calendar=true (align with hold_pending setting).';

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  previous_status public.booking_status,
  new_status public.booking_status not null,
  reason text,
  acted_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index booking_status_history_booking_id_idx
  on public.booking_status_history (booking_id, created_at desc);

create or replace function public.bookings_set_blocks_calendar()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('cancelled', 'rejected', 'completed') then
    new.blocks_calendar := false;
  elsif new.status = 'pending' then
    -- When system_settings.hold_pending_bookings exists, wire via trigger later.
    new.blocks_calendar := true;
  else
    new.blocks_calendar := true;
  end if;
  return new;
end;
$$;

create trigger bookings_blocks_calendar_trg
  before insert or update of status on public.bookings
  for each row execute function public.bookings_set_blocks_calendar();

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create or replace function public.bookings_log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.booking_status_history (
      booking_id, previous_status, new_status, acted_by
    ) values (
      new.id, old.status, new.status, auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger bookings_status_history_trg
  after update of status on public.bookings
  for each row execute function public.bookings_log_status_change();

-- Verification
select conname
from pg_constraint
where conname = 'bookings_no_overlap';

select proname from pg_proc
where proname in ('next_booking_reference', 'bookings_set_blocks_calendar');