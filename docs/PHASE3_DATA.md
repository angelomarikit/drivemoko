# Phase 3 — Supabase data (implemented)

When `VITE_DATA_PROVIDER=supabase`, the app loads **live data** from PostgreSQL via `repositories` (`src/services/supabase/`).

## SQL to run (after 001–005, 002b, 002d)

| Order | File |
|-------|------|
| 1 | `008_notifications.sql` |
| 2 | `009_system_settings.sql` |
| 3 | `011_rls_phase3_core.sql` |

Optional later: `006` payments, `007` partners (Phase 4).

## What uses Supabase now

| Domain | Read | Write |
|--------|------|-------|
| Profiles / users list | Yes | Phase 4 |
| Vehicles + images | Yes | Create, update, archive (admin archive) |
| Bookings | Yes | Admin status transition (basic) |
| Availability blocks | Yes | Add / remove |
| Settings | Yes | Admin save (singleton row) |
| Notifications | Yes (empty until created) | Phase 4 |
| Payments, applications, favorites, reviews | Empty / not wired | Phase 4 |
| SMS | UI retained; **on hold** (no gateway) | Late phase — `COMMUNICATIONS_ROADMAP.md` |
| **New customer booking** (`/book`) | — | **Phase 4** (blocked with message) |

Public `/cars` shows **approved + active** vehicles from the database (RLS).

Partner **Submit vehicle** writes to `vehicles` + `vehicle_images` with status **pending**.

## After migrations

1. Hard refresh the app.
2. Partner: submit a vehicle → appears in partner list and admin approval queue.
3. Admin: approve via vehicle edit (listing status).
4. Public catalog shows approved vehicles only.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Empty vehicle list after save | Run `011_rls_phase3_core.sql`; check partner row has `partner_id = auth.uid()` |
| Permission denied on select | Ensure `002d` + `011` ran |
| Settings save fails | Run `009_system_settings.sql` |
| Booking request from website | Expected until Phase 4 |