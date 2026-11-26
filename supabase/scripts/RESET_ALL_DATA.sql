-- =============================================================================
-- Drive Moko — RESET ALL APPLICATION DATA (DESTRUCTIVE)
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (postgres role).
--
-- Removes: bookings, payments, vehicles, partner financials, notifications,
--          ALL auth users (and profiles via ON DELETE CASCADE).
--
-- Keeps: schema, RLS, functions, vehicle_categories seed rows, system_settings row (id=1).
--
-- Does NOT remove: files in Storage buckets (see section at bottom).
--
-- After reset: recreate admin in Dashboard → Authentication → Users, then run
--              002c_backfill_auth_profiles.sql pattern or register via app + SQL role bump.
-- =============================================================================

begin;

-- Optional: keep a single admin login (uncomment and set email, then comment out full auth delete)
-- delete from auth.users where lower(email) <> lower('admin@drivemoko.com');

-- 1) Partner settlement / earnings (earnings block booking deletes)
delete from public.partner_settlement_lines;
delete from public.partner_settlements;
delete from public.partner_earnings;

-- 2) Payments & refunds
delete from public.refunds;
delete from public.payment_audit_log;
delete from public.payments;

-- 3) Rentals & inspections
delete from public.rental_inspection_photos;
delete from public.rental_inspections;
delete from public.booking_extensions;
delete from public.booking_status_history;
delete from public.bookings;

delete from public.partner_disbursements;

-- 4) Comms & CRM
delete from public.notification_outbox;
delete from public.sms_delivery_log;
delete from public.notifications;
delete from public.customer_favorites;
delete from public.partner_applications;
delete from public.support_inquiries;

-- 5) Partner agreements & fleet
delete from public.partner_agreements;
delete from public.vehicle_availability_blocks;
delete from public.vehicle_maintenance_records;
delete from public.vehicle_images;
delete from public.vehicle_documents;
delete from public.vehicle_approval_history;
delete from public.vehicles;

delete from public.booking_reference_counters;

-- 6) Profiles (children first; profiles removed when auth.users deleted)
delete from public.account_status_history;
delete from public.user_roles;
delete from public.owner_profiles;
delete from public.partner_profiles;

-- 7) All accounts (profiles cascade from auth.users)
delete from auth.identities;
delete from auth.sessions;
delete from auth.refresh_tokens;
delete from auth.mfa_factors;
delete from auth.users;

commit;

-- -----------------------------------------------------------------------------
-- Verify (expect 0 rows)
-- -----------------------------------------------------------------------------
select 'vehicles' as what, count(*) as n from public.vehicles
union all select 'bookings', count(*) from public.bookings
union all select 'profiles', count(*) from public.profiles
union all select 'auth.users', count(*) from auth.users;

-- -----------------------------------------------------------------------------
-- Optional: clear uploaded files (orphans after DB reset)
-- -----------------------------------------------------------------------------
-- delete from storage.objects
-- where bucket_id in (
--   'vehicle-images',
--   'vehicle-images-staging',
--   'payment-proofs',
--   'rental-documents',
--   'inspection-photos'
-- );

-- -----------------------------------------------------------------------------
-- Optional: reset booking reference year counter only (after data wipe)
-- -----------------------------------------------------------------------------
-- delete from public.booking_reference_counters;