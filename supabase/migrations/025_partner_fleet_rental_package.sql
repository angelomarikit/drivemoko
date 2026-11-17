-- Drive Moko — 025 partner fleet rental package (admin-set rates shown on partner dashboard)
-- Requires: 002 partner_profiles, 023 rental package columns on vehicles

alter table public.partner_profiles
  add column if not exists rate_first_day_centavos integer,
  add column if not exists rate_succeeding_day_centavos integer,
  add column if not exists rate_10_days_centavos integer,
  add column if not exists rate_15_plus_centavos integer;

comment on column public.partner_profiles.rate_first_day_centavos is
  'Admin-set tiered package for partner fleet; mirrored to partner vehicles when saved from admin.';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'partner_profiles'
  and column_name like 'rate_%'
order by ordinal_position;