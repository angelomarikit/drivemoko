-- Default: only confirmed/ongoing bookings block the calendar for other customers.
-- Pending requests stay soft until admin confirms (optional hold via hold_pending_bookings).

update public.system_settings
set hold_pending_bookings = false
where id = 1;

alter table public.system_settings
  alter column hold_pending_bookings set default false;

update public.bookings
set blocks_calendar = false
where status = 'pending'
  and blocks_calendar = true
  and deleted_at is null;

create or replace function public.bookings_set_blocks_calendar()
returns trigger
language plpgsql
as $$
declare
  hold_pending boolean := false;
begin
  if new.status in ('cancelled', 'rejected', 'completed') then
    new.blocks_calendar := false;
  elsif new.status = 'pending' then
    select coalesce(s.hold_pending_bookings, false)
      into hold_pending
      from public.system_settings s
      where s.id = 1;
    new.blocks_calendar := hold_pending;
  else
    new.blocks_calendar := true;
  end if;
  return new;
end;
$$;

comment on function public.bookings_set_blocks_calendar() is
  'Pending blocks overlap only when system_settings.hold_pending_bookings is true; confirmed/ongoing always hold.';