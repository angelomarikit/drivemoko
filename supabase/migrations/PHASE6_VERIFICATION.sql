-- Phase 6 verification (read-only). Run after 016–021.

select id, public from storage.buckets
where id in (
  'vehicle-images', 'vehicle-images-staging', 'payment-proofs', 'rental-documents', 'inspection-photos'
)
order by id;

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'payments' and column_name = 'proof_storage_path';

select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'rental_inspections', 'rental_inspection_photos',
    'booking_extensions', 'notification_outbox', 'sms_delivery_log'
  )
order by 1;

select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('enqueue_notification', 'approve_booking_extension', 'admin_provision_profile')
order by 1;