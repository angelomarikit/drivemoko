# Phase 6 — Pre-production audit

**Date:** 2026-11-17  
**Codebase:** Drive Moko Car Rentals (React 19 + Supabase)  
**DB execution:** Not verified by agent — use `supabase/migrations/PHASE6_VERIFICATION.sql`.

## Executive status

| Area | Status | Notes |
|------|--------|--------|
| Routes & UI | **Working** (build passes) | Designs preserved |
| Supabase data path | **Implemented** | `VITE_DATA_PROVIDER=supabase` |
| Migrations 001–015 | **In repo** | User must confirm applied |
| Migrations 016–021 | **In repo (new)** | Pending manual SQL |
| Storage uploads | **Implemented in app** | Requires 016–017 |
| Auth hardening | **Partial** | Callback + reset routes; SMTP in Supabase dashboard |
| Email delivery | **Outbox only** | Edge function stub; not sending |
| SMS | **Not configured** | Adapter + UI status |
| Inspections / extensions | **UI + services** | Requires 018–019 |
| E2E tests | **Scaffold only** | Playwright skipped |
| Vercel | **vercel.json added** | Env validation client-side |

## Migration dependency chain (Phase 6)

After **013–015** (Phase 5):

1. `016_storage_buckets.sql`
2. `017_storage_policies.sql`
3. `018_rental_inspections.sql`
4. `019_rental_extensions.sql`
5. `020_notification_outbox.sql`
6. `021_production_security_hardening.sql`
7. `PHASE6_VERIFICATION.sql`

**Before editing:** run `select count(*) from public.bookings;` — if production data exists, review every migration in a staging project first.

## Security findings (code review)

| Finding | Severity | Mitigation |
|---------|----------|------------|
| `enqueue_notification` insert policy allows any authenticated insert (020) | Medium | Tighten to `is_admin()` or service role only before production |
| `sync_booking_payment_status` callable by any authenticated user | Low | Recompute-only; consider admin/staff-only grant (021 partial) |
| No service role in client | Good | `.env` validator warns on forbidden `VITE_*` secrets |
| Storage private buckets | Good (when 017 applied) | Signed URLs in app for proofs/docs |
| Partner earnings RLS | Good (014) | Partners read-only |
| Frontend route guards | Necessary not sufficient | RLS + RPC checks required |

## Demo / mock remnants

- `VITE_DATA_PROVIDER=mock` still supports Zustand demo.
- Partner earnings in mock mode use `shareAmount()` heuristic.
- SMS simulate path remains for mock.

## Testing status

| Check | Result |
|-------|--------|
| `npm run build` | Run locally after pull |
| `npm run test` | 1 unit test (booking rules) |
| Playwright E2E (10 scenarios) | **Not run** — specs skipped |
| Supabase Security Advisor | **Not run** — user action |
| Storage penetration | **Not run** |

## Page audit (high level)

- Public + auth routes: wired including `/auth/callback`, `/auth/reset-password`, `/auth/verify`.
- Admin: `/admin/settlements` present (Phase 5); SMS dashboard shows provider status.
- License upload on booking: still placeholder copy — use `rental-documents` bucket when wired to booking form.
- Customer payment proof: optional file on admin record payment (Supabase).

## Blockers to production-ready

1. Run migrations 016–021 on staging/production Supabase.
2. Configure Supabase Auth redirect URLs + production SMTP.
3. Deploy `dispatch-notifications` edge function + mark `EMAIL_PROVIDER_STATUS=configured` only after real SMTP.
4. Complete Playwright matrix with staging accounts.
5. Tighten outbox insert RLS before launch.
6. Confirm Phase 5 financial migrations applied.

See also: `docs/PHASE6_IMPLEMENTATION.md`, `docs/PRODUCTION_READINESS.md`.