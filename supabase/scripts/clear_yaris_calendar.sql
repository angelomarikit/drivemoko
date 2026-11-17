-- Clear Yaris schedule: cancel every booking that still blocks the calendar.
-- Run in Supabase Dashboard → SQL Editor (entire file).
-- Safe to re-run.

begin;

-- Preview what will be released
select
  b.reference,
  b.status,
  b.pickup_date,
  b.return_date,
  b.pickup_time,
  b.return_time,
  v.name as vehicle_name
from public.bookings b
join public.vehicles v on v.id = b.vehicle_id
where b.deleted_at is null
  and b.status in ('pending', 'confirmed', 'ongoing')
  and (
    lower(v.model) like '%yaris%'
    or lower(v.name) like '%yaris%'
    or lower(v.brand || ' ' || v.model) like '%yaris%'
  )
order by b.created_at desc;

-- Cancel (trigger sets blocks_calendar = false for cancelled)
with yaris_vehicles as (
  select id from public.vehicles
  where deleted_at is null
    and (
      lower(model) like '%yaris%'
      or lower(name) like '%yaris%'
      or lower(brand || ' ' || coalesce(model, '')) like '%yaris%'
    )
),
updated as (
  update public.bookings b
  set status = 'cancelled', updated_at = now()
  from yaris_vehicles v
  where b.vehicle_id = v.id
    and b.deleted_at is null
    and b.status in ('pending', 'confirmed', 'ongoing')
  returning b.reference, b.status, b.pickup_date, b.return_date
)
select 'cancelled' as action, * from updated;

commit;

-- Optional: cancel a single stuck reference (uncomment if needed)
-- update public.bookings set status = 'cancelled', updated_at = now()
-- where reference in ('DM-2026-0001', 'DM-2026-0008') and deleted_at is null;