-- Drive Moko — 024 vehicle promo video for product page
alter table public.vehicles
  add column if not exists promo_video_path text;

comment on column public.vehicles.promo_video_path is
  'Optional showcase video (storage path or URL) shown on the public vehicle page.';

-- Allow promo videos in existing vehicle image buckets (path: {vehicleId}/videos/…)
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
where id in ('vehicle-images', 'vehicle-images-staging');

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'vehicles' and column_name = 'promo_video_path';