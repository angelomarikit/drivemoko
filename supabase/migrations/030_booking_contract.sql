-- Signed rental contract PDF (stored in rental-documents bucket)

alter table public.bookings
  add column if not exists contract_storage_path text,
  add column if not exists contract_signed_at timestamptz,
  add column if not exists contract_signer_name text;