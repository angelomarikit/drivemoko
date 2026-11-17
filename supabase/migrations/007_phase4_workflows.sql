-- Drive Moko — 007 Phase 4: applications, favorites, inquiries
-- Requires: 002

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  address text not null,
  vehicle_details text not null default '',
  ownership_type public.ownership_type not null default 'owned',
  vehicle_count integer not null default 1 check (vehicle_count >= 1),
  notes text not null default '',
  status public.application_status not null default 'pending',
  share_rate_bps integer,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

create index if not exists partner_applications_status_idx on public.partner_applications (status, created_at desc);

create table if not exists public.customer_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

create table if not exists public.support_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  message text not null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Booking created → in-app notifications (security definer)
create or replace function public.notify_booking_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_row record;
  vehicle_name text;
begin
  select v.name into vehicle_name from public.vehicles v where v.id = new.vehicle_id;
  for admin_row in select id from public.profiles where role = 'admin' and status = 'active' loop
    insert into public.notifications (user_id, title, body, href)
    values (
      admin_row.id,
      'New booking request',
      coalesce(vehicle_name, 'Vehicle') || ' · ' || new.reference,
      '/admin/bookings'
    );
  end loop;
  insert into public.notifications (user_id, title, body, href)
  values (
    new.customer_id,
    'Booking received',
    'Your request ' || new.reference || ' is pending confirmation.',
    '/customer/bookings'
  );
  return new;
end;
$$;

drop trigger if exists bookings_notify_pending on public.bookings;
create trigger bookings_notify_pending
  after insert on public.bookings
  for each row
  when (new.status = 'pending')
  execute function public.notify_booking_pending();

select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('partner_applications', 'customer_favorites', 'support_inquiries')
order by 1;