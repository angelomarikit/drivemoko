-- Presentation reset: hide all bookings in the app and free every vehicle calendar.
-- Does NOT delete payment rows (FK restrict). Bookings are soft-deleted + cancelled.
-- Run entire file in Supabase → SQL Editor before your demo.

begin;

-- Preview
select status, count(*) as n
from public.bookings
where deleted_at is null
group by status
order by status;

-- Free calendars + hide from app (snapshot only loads deleted_at is null)
update public.bookings
set
  status = 'cancelled',
  deleted_at = coalesce(deleted_at, now()),
  updated_at = now()
where deleted_at is null;

-- Next new booking starts at DM-2026-0001 again (adjust year if needed)
delete from public.booking_reference_counters where year = 2026;

insert into public.booking_reference_counters (year, last_value)
values (2026, 0)
on conflict (year) do update set last_value = 0;

-- Verify app should see zero bookings
select count(*) as active_booking_rows
from public.bookings
where deleted_at is null;

commit;

-- Optional: clear booking-related in-app notifications (uncomment if needed)
-- delete from public.notifications where body like '%DM-%' or title ilike '%booking%';