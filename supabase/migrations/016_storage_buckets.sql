-- Drive Moko — 016 Storage buckets (Phase 6)
-- Run manually in Supabase SQL Editor. Idempotent bucket inserts.
-- Requires: Supabase project with storage enabled.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-images', 'vehicle-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('vehicle-images-staging', 'vehicle-images-staging', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('rental-documents', 'rental-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('inspection-photos', 'inspection-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.payments
  add column if not exists proof_storage_path text,
  add column if not exists proof_uploaded_at timestamptz;

alter table public.vehicle_images
  add column if not exists bucket_id text not null default 'vehicle-images';

comment on column public.payments.proof_storage_path is 'Full storage path e.g. payment-proofs/{booking_id}/{payment_id}/file.jpg';

select id, public, file_size_limit from storage.buckets
where id in (
  'vehicle-images', 'vehicle-images-staging', 'payment-proofs', 'rental-documents', 'inspection-photos'
)
order by id;