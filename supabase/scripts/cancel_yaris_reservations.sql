-- One-off: cancel active Yaris bookings so the calendar opens again.
-- Prefer clear_yaris_calendar.sql (preview + cancel in one file).
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.

begin;

with yaris_vehicles as (
  select id
  from public.vehicles
  where deleted_at is null
    and (
      lower(model) like '%yaris%'
      or lower(name) like '%yaris%'
      or lower(brand || ' ' || coalesce(model, '')) like '%yaris%'
    )
),
updated as (
  update public.bookings b
  set
    status = 'cancelled',
    updated_at = now()
  from yaris_vehicles v
  where b.vehicle_id = v.id
    and b.deleted_at is null
    and b.status in ('pending', 'confirmed', 'ongoing')
  returning b.id, b.reference, b.status, b.pickup_date, b.return_date
)
select * from updated;

-- Typical test hold from booking flow:
-- update public.bookings
-- set status = 'cancelled', updated_at = now()
-- where reference = 'DM-2026-0001' and deleted_at is null;

commit;