-- Drive Moko — 020 notification outbox (email + in-app)
-- Delivery via Edge Function / cron — not from browser secrets

create type public.delivery_channel as enum ('email', 'sms', 'in_app');
create type public.outbox_status as enum ('pending', 'processing', 'sent', 'failed', 'skipped');

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  channel public.delivery_channel not null,
  template_key text not null,
  recipient_user_id uuid references public.profiles (id),
  recipient_email text,
  recipient_phone text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status public.outbox_status not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index notification_outbox_pending_idx
  on public.notification_outbox (status, scheduled_for)
  where status in ('pending', 'processing');

create table if not exists public.sms_delivery_log (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.notification_outbox (id) on delete set null,
  provider text not null default 'not_configured',
  to_phone text not null,
  body text not null,
  status text not null default 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

alter table public.notification_outbox enable row level security;
alter table public.sms_delivery_log enable row level security;

create policy "outbox_admin_read"
  on public.notification_outbox for select to authenticated
  using (public.is_admin());

create policy "outbox_insert_service"
  on public.notification_outbox for insert to authenticated
  with check (true);

create policy "sms_log_admin"
  on public.sms_delivery_log for select to authenticated
  using (public.is_admin());

create or replace function public.enqueue_notification(
  p_channel public.delivery_channel,
  p_template_key text,
  p_idempotency_key text,
  p_payload jsonb,
  p_recipient_user_id uuid default null,
  p_recipient_email text default null,
  p_recipient_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.notification_outbox (
    channel, template_key, idempotency_key, payload,
    recipient_user_id, recipient_email, recipient_phone
  )
  values (
    p_channel, p_template_key, p_idempotency_key, coalesce(p_payload, '{}'::jsonb),
    p_recipient_user_id, p_recipient_email, p_recipient_phone
  )
  on conflict (idempotency_key) do nothing
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.enqueue_notification(public.delivery_channel, text, text, jsonb, uuid, text, text) to authenticated;

select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('notification_outbox', 'sms_delivery_log');