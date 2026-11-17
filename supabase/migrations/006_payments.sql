-- Drive Moko — 006 payments
-- Requires: 005_bookings.sql

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  amount_centavos bigint not null check (amount_centavos > 0),
  method public.payment_method not null,
  status public.payment_record_status not null default 'pending',
  reference text not null default '',
  note text not null default '',
  recorded_by uuid references public.profiles (id),
  verified_by uuid references public.profiles (id),
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_booking_id_idx on public.payments (booking_id, created_at desc);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'payments';