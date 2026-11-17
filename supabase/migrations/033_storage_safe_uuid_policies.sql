-- Fix storage RLS: avoid raw ::uuid cast on path segments (e.g. legacy "yaris" folders).
-- Requires: 017_storage_policies.sql

create or replace function public.storage_segment_as_uuid(segment text)
returns uuid
language plpgsql
immutable
as $$
begin
  if segment is null or segment !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    return null;
  end if;
  return segment::uuid;
end;
$$;

-- Staging: vehicle owner/partner/admin read
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
        where v.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
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
        where v.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
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
        where v.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
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
        where v.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
          and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
      )
    )
  );

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
        where b.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
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
        where b.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
          and b.customer_id = auth.uid()
      )
    )
  );

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
        where b.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
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
        where b.id = public.storage_segment_as_uuid(public.storage_first_segment(name))
          and b.customer_id = auth.uid()
      )
    )
  );