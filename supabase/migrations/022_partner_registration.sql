-- Drive Moko — 022 partner registration fields (admin provisioning)
-- Requires: 002 partner_profiles

alter table public.partner_profiles
  add column if not exists business_name text not null default '',
  add column if not exists vehicle_count integer not null default 0 check (vehicle_count >= 0),
  add column if not exists ownership_type public.ownership_type not null default 'owned',
  add column if not exists vehicle_summary text not null default '',
  add column if not exists contract_reference text not null default '',
  add column if not exists contract_notes text not null default '',
  add column if not exists contact_person text not null default '';

comment on column public.partner_profiles.vehicle_summary is
  'Description of vehicle units covered by the partner agreement.';

-- After Edge Function creates auth.users, finalize partner row (admin only)
create or replace function public.admin_finalize_partner_profile(
  p_profile_id uuid,
  p_share_rate_bps integer,
  p_business_name text,
  p_vehicle_count integer,
  p_ownership_type public.ownership_type,
  p_vehicle_summary text,
  p_contract_reference text,
  p_contract_notes text,
  p_contact_person text,
  p_agreement_signed_at timestamptz default null,
  p_full_name text default null,
  p_phone text default null,
  p_address text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can finalize partner profiles.';
  end if;
  update public.profiles
  set role = 'partner',
      title = 'Partner (Link)',
      full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      phone = coalesce(nullif(trim(p_phone), ''), phone),
      address = coalesce(nullif(trim(p_address), ''), address),
      notes = coalesce(p_notes, notes)
  where id = p_profile_id;

  insert into public.partner_profiles (
    profile_id,
    share_rate_bps,
    business_name,
    vehicle_count,
    ownership_type,
    vehicle_summary,
    contract_reference,
    contract_notes,
    contact_person,
    agreement_signed_at
  )
  values (
    p_profile_id,
    p_share_rate_bps,
    coalesce(p_business_name, ''),
    coalesce(p_vehicle_count, 0),
    coalesce(p_ownership_type, 'owned'),
    coalesce(p_vehicle_summary, ''),
    coalesce(p_contract_reference, ''),
    coalesce(p_contract_notes, ''),
    coalesce(p_contact_person, ''),
    p_agreement_signed_at
  )
  on conflict (profile_id) do update set
    share_rate_bps = excluded.share_rate_bps,
    business_name = excluded.business_name,
    vehicle_count = excluded.vehicle_count,
    ownership_type = excluded.ownership_type,
    vehicle_summary = excluded.vehicle_summary,
    contract_reference = excluded.contract_reference,
    contract_notes = excluded.contract_notes,
    contact_person = excluded.contact_person,
    agreement_signed_at = coalesce(excluded.agreement_signed_at, partner_profiles.agreement_signed_at);
end;
$$;

grant execute on function public.admin_finalize_partner_profile(
  uuid, integer, text, integer, public.ownership_type, text, text, text, text, timestamptz, text, text, text, text
) to authenticated;

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'partner_profiles'
order by ordinal_position;