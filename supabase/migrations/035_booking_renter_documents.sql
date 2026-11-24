-- Renter verification uploads (driver license, valid ID, proof of billing / barangay clearance)

alter table public.bookings
  add column if not exists valid_id_storage_path text,
  add column if not exists proof_of_billing_storage_path text;

comment on column public.bookings.document_storage_path is 'Driver license image path (rental-documents bucket)';
comment on column public.bookings.valid_id_storage_path is 'Renter valid government ID path';
comment on column public.bookings.proof_of_billing_storage_path is 'Proof of billing or barangay clearance path';