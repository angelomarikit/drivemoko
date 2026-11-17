-- Drive Moko — 013 Phase 5 financial (agreements, earnings, settlements, refunds)
-- Requires: 006_payments, 007, partner_profiles, system_settings

create type public.earning_status as enum (
  'pending',
  'payable',
  'in_settlement',
  'settled',
  'void'
);

create type public.settlement_status as enum ('draft', 'paid', 'void');

create type public.refund_status as enum ('pending', 'completed', 'rejected');

-- Vehicle-specific or partner-default agreements (admin approved)
create table if not exists public.partner_agreements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  share_rate_bps integer not null check (share_rate_bps >= 0 and share_rate_bps <= 10000),
  effective_from date not null default current_date,
  effective_to date,
  approved_by uuid references public.profiles (id),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (partner_id, vehicle_id, effective_from)
);

create index if not exists partner_agreements_lookup_idx
  on public.partner_agreements (partner_id, vehicle_id, effective_from desc);

-- One earning row per completed booking (partner vehicles only)
create table if not exists public.partner_earnings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  partner_id uuid not null references public.profiles (id),
  vehicle_id uuid not null references public.vehicles (id),
  gross_centavos bigint not null check (gross_centavos >= 0),
  share_rate_bps integer not null,
  partner_share_centavos bigint not null check (partner_share_centavos >= 0),
  company_share_centavos bigint not null check (company_share_centavos >= 0),
  status public.earning_status not null default 'pending',
  recognized_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_earnings_partner_idx on public.partner_earnings (partner_id, status);

create table if not exists public.partner_settlements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles (id),
  period_start date not null,
  period_end date not null,
  total_partner_centavos bigint not null default 0,
  status public.settlement_status not null default 'draft',
  payout_reference text not null default '',
  paid_at timestamptz,
  paid_by uuid references public.profiles (id),
  notes text not null default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint partner_settlements_period check (period_end >= period_start)
);

create table if not exists public.partner_settlement_lines (
  settlement_id uuid not null references public.partner_settlements (id) on delete cascade,
  earning_id uuid not null references public.partner_earnings (id) on delete restrict,
  partner_share_centavos bigint not null,
  primary key (settlement_id, earning_id),
  unique (earning_id)
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  payment_id uuid references public.payments (id),
  amount_centavos bigint not null check (amount_centavos > 0),
  reason text not null default '',
  status public.refund_status not null default 'pending',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_audit_log (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete set null,
  booking_id uuid references public.bookings (id),
  action text not null,
  acted_by uuid references public.profiles (id),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Resolve share rate in basis points
create or replace function public.resolve_partner_share_bps(p_vehicle_id uuid, p_partner_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  agreement_bps integer;
  profile_bps integer;
  default_pct numeric;
begin
  select share_rate_bps into agreement_bps
  from public.partner_agreements
  where partner_id = p_partner_id
    and (vehicle_id = p_vehicle_id or vehicle_id is null)
    and effective_from <= current_date
    and (effective_to is null or effective_to >= current_date)
  order by vehicle_id nulls last, effective_from desc
  limit 1;
  if agreement_bps is not null then
    return agreement_bps;
  end if;
  select share_rate_bps into profile_bps
  from public.partner_profiles
  where profile_id = p_partner_id;
  if profile_bps is not null then
    return profile_bps;
  end if;
  select default_partner_share into default_pct from public.system_settings where id = 1;
  return coalesce(round(default_pct * 100)::integer, 7000);
end;
$$;

-- Sync booking payment_status from verified payments minus refunds
create or replace function public.sync_booking_payment_status(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_due bigint;
  verified_sum bigint;
  refund_sum bigint;
  new_status public.payment_status;
begin
  select price_total_centavos into total_due from public.bookings where id = p_booking_id;
  if total_due is null then
    return;
  end if;
  select coalesce(sum(amount_centavos), 0) into verified_sum
  from public.payments
  where booking_id = p_booking_id and status = 'verified';
  select coalesce(sum(amount_centavos), 0) into refund_sum
  from public.refunds
  where booking_id = p_booking_id and status = 'completed';
  verified_sum := verified_sum - refund_sum;
  if verified_sum <= 0 then
    new_status := 'unpaid';
  elsif verified_sum < total_due then
    new_status := 'partial';
  else
    new_status := 'paid';
  end if;
  update public.bookings set payment_status = new_status where id = p_booking_id;
  perform public.refresh_partner_earning_payable(p_booking_id);
end;
$$;

create or replace function public.refresh_partner_earning_payable(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
begin
  select status, payment_status into b from public.bookings where id = p_booking_id;
  if b.status = 'completed' and b.payment_status in ('paid', 'partial') then
    update public.partner_earnings
    set status = 'payable', recognized_at = coalesce(recognized_at, now())
    where booking_id = p_booking_id and status in ('pending', 'payable');
  end if;
end;
$$;

-- Create partner earning when booking completes
create or replace function public.on_booking_completed_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  share_bps integer;
  partner_amt bigint;
  company_amt bigint;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;
  select v.partner_id, v.id as vehicle_id into v
  from public.vehicles v where v.id = new.vehicle_id;
  if v.partner_id is null then
    return new;
  end if;
  share_bps := public.resolve_partner_share_bps(new.vehicle_id, v.partner_id);
  partner_amt := round(new.price_total_centavos * share_bps / 10000.0);
  company_amt := new.price_total_centavos - partner_amt;
  insert into public.partner_earnings (
    booking_id, partner_id, vehicle_id,
    gross_centavos, share_rate_bps, partner_share_centavos, company_share_centavos, status
  ) values (
    new.id, v.partner_id, new.vehicle_id,
    new.price_total_centavos, share_bps, partner_amt, company_amt, 'pending'
  )
  on conflict (booking_id) do nothing;
  perform public.refresh_partner_earning_payable(new.id);
  return new;
end;
$$;

drop trigger if exists bookings_partner_earnings_trg on public.bookings;
create trigger bookings_partner_earnings_trg
  after update of status on public.bookings
  for each row execute function public.on_booking_completed_earnings();

create or replace function public.on_payment_change_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_booking_payment_status(coalesce(new.booking_id, old.booking_id));
  if tg_op = 'UPDATE' then
    insert into public.payment_audit_log (payment_id, booking_id, action, acted_by, detail)
    values (new.id, new.booking_id, 'payment_updated', new.verified_by, jsonb_build_object('status', new.status));
  elsif tg_op = 'INSERT' then
    insert into public.payment_audit_log (payment_id, booking_id, action, acted_by, detail)
    values (new.id, new.booking_id, 'payment_recorded', new.recorded_by, jsonb_build_object('status', new.status));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists payments_sync_trg on public.payments;
create trigger payments_sync_trg
  after insert or update of status, amount_centavos on public.payments
  for each row execute function public.on_payment_change_sync();

-- Verification
select table_name from information_schema.tables
where table_schema = 'public' and table_name in (
  'partner_agreements', 'partner_earnings', 'partner_settlements', 'refunds', 'payment_audit_log'
);