-- Driver package customer rates (admin-managed, system-wide)

alter table public.system_settings
  add column if not exists driver_inside_per_day_centavos integer not null default 100000,
  add column if not exists driver_outside_first_day_centavos integer not null default 300000,
  add column if not exists driver_outside_succeeding_centavos integer not null default 100000;