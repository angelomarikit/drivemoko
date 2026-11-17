-- Find fleet media paths whose first folder is not a UUID (e.g. "yaris").
-- Run read-only in Supabase SQL Editor; fix by re-uploading under vehicle-images/{vehicle_uuid}/...

with paths as (
  select
    vi.vehicle_id,
    v.name as vehicle_name,
    v.model,
    vi.storage_path,
    split_part(
    regexp_replace(vi.storage_path, '^vehicle-images(-staging)?/', ''),
    '/',
    1
  ) as first_segment
  from public.vehicle_images vi
  join public.vehicles v on v.id = vi.vehicle_id
  where vi.storage_path is not null
    and vi.storage_path <> ''
),
promo as (
  select
    v.id as vehicle_id,
    v.name as vehicle_name,
    v.model,
    v.promo_video_path as storage_path,
    split_part(
      regexp_replace(v.promo_video_path, '^vehicle-images(-staging)?/', ''),
      '/',
      1
    ) as first_segment
  from public.vehicles v
  where v.promo_video_path is not null
    and v.promo_video_path <> ''
    and v.deleted_at is null
)
select 'vehicle_images' as source, vehicle_id, vehicle_name, model, storage_path, first_segment
from paths
where first_segment !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
union all
select 'promo_video' as source, vehicle_id, vehicle_name, model, storage_path, first_segment
from promo
where first_segment !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
order by source, vehicle_name;