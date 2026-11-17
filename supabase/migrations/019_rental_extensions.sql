-- Drive Moko — 019 rental extensions & late return flags
-- Requires: 005 bookings overlap constraint, 018

create type public.extension_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table if not exists public.booking_extensions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  requested_return_date date not null,
  requested_return_time time not null default '18:00',
  additional_charge_centavos bigint not null default 0 check (additional_charge_centavos >= 0),
  status public.extension_status not null default 'pending',
  reason text not null default '',
  requested_by uuid references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index booking_extensions_booking_idx on public.booking_extensions (booking_id, created_at desc);

alter table public.bookings
  add column if not exists late_return_flag boolean not null default false,
  add column if not exists late_fee_centavos bigint not null default 0 check (late_fee_centavos >= 0);

create or replace function public.approve_booking_extension(p_extension_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ext record;
  booking_row record;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve extensions.';
  end if;
  select * into ext from public.booking_extensions where id = p_extension_id for update;
  if not found then
    raise exception 'Extension not found.';
  end if;
  if ext.status <> 'pending' then
    raise exception 'Extension is not pending.';
  end if;
  select * into booking_row from public.bookings where id = ext.booking_id for update;
  if booking_row.status not in ('confirmed', 'ongoing') then
    raise exception 'Booking is not eligible for extension.';
  end if;
  update public.bookings
  set
    return_date = ext.requested_return_date,
    return_time = ext.requested_return_time,
    price_total_centavos = price_total_centavos + ext.additional_charge_centavos
  where id = ext.booking_id;
  update public.booking_extensions
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_extension_id;
end;
$$;

grant execute on function public.approve_booking_extension(uuid) to authenticated;

alter table public.booking_extensions enable row level security;

create policy "extensions_admin_all"
  on public.booking_extensions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "extensions_customer_insert"
  on public.booking_extensions for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );

create policy "extensions_customer_read"
  on public.booking_extensions for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );

select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname = 'approve_booking_extension';