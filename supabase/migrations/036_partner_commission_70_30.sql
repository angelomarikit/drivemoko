-- Standard partner commission: 70% link / 30% company on booking quote total

update public.system_settings
set
  default_partner_share = 70,
  company_commission_rate = 30
where id = 1;

update public.partner_profiles
set share_rate_bps = 7000
where share_rate_bps is distinct from 7000 or share_rate_bps is null;

create or replace function public.resolve_partner_share_bps(p_vehicle_id uuid, p_partner_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 7000;
$$;

comment on function public.resolve_partner_share_bps(uuid, uuid) is
  'Fixed 70% partner commission on booking total (7000 basis points).';

comment on column public.partner_profiles.share_first_day_centavos is
  'Deprecated — partner commission is 70% of booking total (see resolve_partner_share_bps).';
comment on column public.partner_profiles.share_succeeding_day_centavos is 'Deprecated — use 70% booking total commission.';
comment on column public.partner_profiles.share_10_days_centavos is 'Deprecated — use 70% booking total commission.';
comment on column public.partner_profiles.share_15_plus_centavos is 'Deprecated — use 70% booking total commission.';