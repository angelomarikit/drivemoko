-- Drive Moko — 026 fixed partner share (per day tiers, replaces % share for app display & admin)
alter table public.partner_profiles
  add column if not exists share_first_day_centavos integer,
  add column if not exists share_succeeding_day_centavos integer,
  add column if not exists share_10_days_centavos integer,
  add column if not exists share_15_plus_centavos integer;

alter table public.system_settings
  add column if not exists default_share_first_day_centavos integer not null default 200000,
  add column if not exists default_share_succeeding_centavos integer not null default 150000,
  add column if not exists default_share_10_days_centavos integer not null default 130000,
  add column if not exists default_share_15_plus_centavos integer not null default 120000;

comment on column public.partner_profiles.share_first_day_centavos is
  'Fixed partner payout for day 1 of a rental (centavos).';

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'partner_profiles' and column_name like 'share_%'
order by ordinal_position;