# Phase 6 — Implementation summary

## Storage (`src/services/storage/`)

- Buckets: `vehicle-images`, `vehicle-images-staging`, `payment-proofs`, `rental-documents`, `inspection-photos`
- `upload.ts` — validation, resize, signed URLs
- `vehicleImages.ts` — partner/admin vehicle photos (staging until approved)
- `VehicleImage` — public URL + signed URL for private paths
- Vehicle form: cloud upload after vehicle exists; staging bucket for unapproved listings

## Auth (`src/services/auth/authService.ts`, `AuthPages.tsx`)

- Email redirect: `/auth/callback`, `/auth/reset-password`
- Password update from recovery link
- Resend verification (`/auth/verify`)
- Customer signup remains customer-only (`002b` trigger)

## Notifications

- Templates: `src/services/notifications/templates.ts`
- Outbox enqueue: `src/services/notifications/outbox.ts` + RPC `enqueue_notification`
- Booking status transitions enqueue email + in_app rows (no SMTP send until edge worker)

## SMS

- `src/services/sms/adapter.ts` — status `not_configured` by default
- Admin SMS UI unchanged; status banner added

## Rental lifecycle

- `src/services/rentals/inspections.ts` + `extensions.ts`
- `RentalOpsPanel` on admin booking detail (check-out, return, extension, late fee)

## Payments

- Optional proof upload → `payment-proofs` path on `payments.proof_storage_path` (016)

## Reliability

- `ErrorBoundary`, `lib/env.ts` client env validation
- `vercel.json` SPA fallback + security headers

## Edge function stub

- `supabase/functions/dispatch-notifications/index.ts` — returns not configured until SMTP secrets exist