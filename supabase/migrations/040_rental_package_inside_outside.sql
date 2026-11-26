-- Rental package: inside vs outside Nueva Vizcaya (existing rate_* columns = outside).

alter table public.system_settings
  add column if not exists default_inside_rate_first_day_centavos integer not null default 349900,
  add column if not exists default_inside_rate_succeeding_centavos integer not null default 249900,
  add column if not exists default_inside_rate_10_days_centavos integer not null default 219900,
  add column if not exists default_inside_rate_15_plus_centavos integer not null default 199900;

comment on column public.system_settings.default_rate_first_day_centavos is
  'Default tiered rental rates outside Nueva Vizcaya (centavos).';
comment on column public.system_settings.default_inside_rate_first_day_centavos is
  'Default tiered rental rates within Nueva Vizcaya (centavos).';

alter table public.vehicles
  add column if not exists rate_inside_first_day_centavos integer,
  add column if not exists rate_inside_succeeding_day_centavos integer,
  add column if not exists rate_inside_10_days_centavos integer,
  add column if not exists rate_inside_15_plus_centavos integer;

comment on column public.vehicles.rate_first_day_centavos is
  'Outside Nueva Vizcaya — day 1 (centavos). NULL = system default outside.';
comment on column public.vehicles.rate_inside_first_day_centavos is
  'Within Nueva Vizcaya — day 1 (centavos). NULL = system default inside.';

alter table public.partner_profiles
  add column if not exists rate_inside_first_day_centavos integer,
  add column if not exists rate_inside_succeeding_day_centavos integer,
  add column if not exists rate_inside_10_days_centavos integer,
  add column if not exists rate_inside_15_plus_centavos integer;

alter table public.bookings
  add column if not exists rental_service_zone text not null default 'inside'
    check (rental_service_zone in ('inside', 'outside'));

comment on column public.bookings.rental_service_zone is
  'Tiered rental package zone used when the booking was quoted (inside vs outside province).';