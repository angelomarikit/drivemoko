-- Drive Moko — 017 Storage RLS policies (Phase 6)
-- Requires: 016_storage_buckets.sql, profiles/vehicles RLS helpers

-- Helpers: first folder segment is vehicle_id or booking_id
create or replace function public.storage_first_segment(object_name text)
returns text
language sql
immutable
as $$
  select split_part(object_name, '/', 1);
$$;

-- Public read approved vehicle images only
drop policy if exists "vehicle_images_public_read" on storage.objects;
create policy "vehicle_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'vehicle-images');

-- Staging: vehicle owner/partner/admin read; no public access
drop policy if exists "vehicle_staging_read" on storage.objects;
create policy "vehicle_staging_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vehicle-images-staging'
    and (
      public.is_admin()
      or exists (
        select 1 from public.vehicles v
        where v.id = public.storage_first_segment(name)::uuid
          and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
      )
    )
  );

drop policy if exists "vehicle_images_write" on storage.objects;
create policy "vehicle_images_write"
  on storage.objects for insert
  to authenticated
  with check (
  bucket_id in ('vehicle-images', 'vehicle-images-staging')
  and (
    public.is_admin()
    or exists (
      select 1 from public.vehicles v
      where v.id = public.storage_first_segment(name)::uuid
        and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
    )
  )
);

drop policy if exists "vehicle_images_update_delete" on storage.objects;
create policy "vehicle_images_update_delete"
  on storage.objects for all
  to authenticated
  using (
    bucket_id in ('vehicle-images', 'vehicle-images-staging')
    and (
      public.is_admin()
      or exists (
        select 1 from public.vehicles v
        where v.id = public.storage_first_segment(name)::uuid
          and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
      )
    )
  )
  with check (
    bucket_id in ('vehicle-images', 'vehicle-images-staging')
    and (
      public.is_admin()
      or exists (
        select 1 from public.vehicles v
        where v.id = public.storage_first_segment(name)::uuid
          and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
      )
    )
  );

-- Payment proofs: customer on their booking, admin all
drop policy if exists "payment_proofs_select" on storage.objects;
create policy "payment_proofs_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id = public.storage_first_segment(name)::uuid
          and b.customer_id = auth.uid()
      )
    )
  );

drop policy if exists "payment_proofs_insert" on storage.objects;
create policy "payment_proofs_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id = public.storage_first_segment(name)::uuid
          and b.customer_id = auth.uid()
      )
    )
  );

drop policy if exists "payment_proofs_admin_manage" on storage.objects;
create policy "payment_proofs_admin_manage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'payment-proofs' and public.is_admin())
  with check (bucket_id = 'payment-proofs' and public.is_admin());

-- Rental documents + inspection photos: customer (own booking), admin, staff on vehicle
drop policy if exists "rental_docs_select" on storage.objects;
create policy "rental_docs_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('rental-documents', 'inspection-photos')
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        join public.vehicles v on v.id = b.vehicle_id
        where b.id = public.storage_first_segment(name)::uuid
          and (
            b.customer_id = auth.uid()
            or v.owner_id = auth.uid()
            or v.partner_id = auth.uid()
          )
      )
    )
  );

drop policy if exists "rental_docs_insert" on storage.objects;
create policy "rental_docs_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('rental-documents', 'inspection-photos')
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        join public.vehicles v on v.id = b.vehicle_id
        where b.id = public.storage_first_segment(name)::uuid
          and (b.customer_id = auth.uid() or v.owner_id = auth.uid() or v.partner_id = auth.uid())
      )
    )
  );

drop policy if exists "rental_docs_admin_manage" on storage.objects;
create policy "rental_docs_admin_manage"
  on storage.objects for all
  to authenticated
  using (bucket_id in ('rental-documents', 'inspection-photos') and public.is_admin())
  with check (bucket_id in ('rental-documents', 'inspection-photos') and public.is_admin());

-- Image promotion from staging → public bucket is performed by the app (storage copy + DB path update)
-- after an administrator approves the vehicle listing.

-- Verification (policies live on storage.objects; there is no storage.policies relation)
select policyname, cmd, roles::text
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;