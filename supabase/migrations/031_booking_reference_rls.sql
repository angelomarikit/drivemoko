-- Customers call next_booking_reference when creating a booking; the counter table
-- must not be writable under the caller's RLS context.

alter table public.booking_reference_counters enable row level security;

-- No policies: deny direct access; only security definer RPC may touch this table.

create or replace function public.next_booking_reference(p_year integer default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := coalesce(p_year, extract(year from timezone('Asia/Manila', now()))::integer);
  n integer;
begin
  insert into public.booking_reference_counters as c (year, last_value)
  values (y, 1)
  on conflict (year) do update
    set last_value = c.last_value + 1
  returning last_value into n;
  return format('DM-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

revoke all on table public.booking_reference_counters from anon, authenticated;
revoke all on function public.next_booking_reference(integer) from public, anon;
grant execute on function public.next_booking_reference(integer) to authenticated;