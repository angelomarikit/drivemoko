-- Drive Moko — 023 tiered rental packages (admin + per vehicle)
-- Requires: 003 vehicles, 009 system_settings

alter table public.system_settings
  add column if not exists default_rate_first_day_centavos integer not null default 349900,
  add column if not exists default_rate_succeeding_centavos integer not null default 249900,
  add column if not exists default_rate_10_days_centavos integer not null default 219900,
  add column if not exists default_rate_15_plus_centavos integer not null default 199900;

alter table public.vehicles
  add column if not exists rate_first_day_centavos integer,
  add column if not exists rate_succeeding_day_centavos integer,
  add column if not exists rate_10_days_centavos integer,
  add column if not exists rate_15_plus_centavos integer;

comment on column public.vehicles.rate_first_day_centavos is
  'Tiered package: day 1 rate (centavos). NULL = use system_settings defaults.';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('system_settings', 'vehicles')
  and column_name like '%rate%'
order by table_name, ordinal_position;