-- Refundable security deposit (displayed on booking; separate from rental total)

alter table public.system_settings
  add column if not exists security_deposit_centavos integer not null default 300000;