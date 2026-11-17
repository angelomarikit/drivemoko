-- Drive Moko — 009 system settings (singleton)
-- Requires: 001

create table if not exists public.system_settings (
  id smallint primary key default 1 check (id = 1),
  hold_pending_bookings boolean not null default true,
  company_commission_rate numeric(5, 2) not null default 30,
  default_partner_share numeric(5, 2) not null default 70,
  owners_can_block_availability boolean not null default true,
  sms_sender_name text not null default 'Drive Moko',
  locations text[] not null default array[
    'Solano', 'Bayombong', 'Bambang', 'Bagabag', 'Aritao', 'Quezon', 'Diadi', 'Kasibu', 'Villaverde'
  ],
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id) values (1)
on conflict (id) do nothing;

select hold_pending_bookings, default_partner_share from public.system_settings where id = 1;