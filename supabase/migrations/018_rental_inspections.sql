-- Drive Moko — 018 rental check-out / return inspections
-- Requires: 005_bookings, 016

create type public.inspection_phase as enum ('checkout', 'return');

create table if not exists public.rental_inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  phase public.inspection_phase not null,
  recorded_at timestamptz not null default now(),
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  fuel_level text not null default '',
  condition_notes text not null default '',
  damage_notes text not null default '',
  extra_charges_centavos bigint not null default 0 check (extra_charges_centavos >= 0),
  staff_id uuid references public.profiles (id),
  customer_ack boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id, phase)
);

create table if not exists public.rental_inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.rental_inspections (id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index rental_inspections_booking_idx on public.rental_inspections (booking_id, phase);

alter table public.rental_inspections enable row level security;
alter table public.rental_inspection_photos enable row level security;

create policy "inspections_admin_all"
  on public.rental_inspections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "inspections_staff_read"
  on public.rental_inspections for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      join public.vehicles v on v.id = b.vehicle_id
      where b.id = booking_id
        and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
    )
  );

create policy "inspection_photos_admin"
  on public.rental_inspection_photos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "inspection_photos_staff_read"
  on public.rental_inspection_photos for select to authenticated
  using (
    exists (
      select 1 from public.rental_inspections i
      join public.bookings b on b.id = i.booking_id
      join public.vehicles v on v.id = b.vehicle_id
      where i.id = inspection_id
        and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
    )
  );

select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'rental_inspection%'
order by 1;