# Drive Moko — Production progress report

**Project:** Drive Moko Car Rentals – Nueva Vizcaya  
**Company:** Nehemiah Sales and Services Corporation  
**Report date:** 2026-11-17  
**Workspace:** `drivemoko` (React + Vite + Supabase)

This document summarizes **what was accomplished** across planning, audit, database, auth, data integration, workflows, and production copy—without claiming features that were not implemented or SQL that was not run on your Supabase project.

---

## Executive summary

| Area | Status |
|------|--------|
| Application audit & plan | **Complete** (documentation) |
| Supabase schema 001–005 | **Scripted** (you run in SQL Editor) |
| Auth (Phase 2) | **Implemented** in app |
| Data reads + vehicles (Phase 3) | **Implemented** in app |
| Booking / payments / workflows (Phase 4) | **Implemented** in app |
| RLS policies (011 + 011b) | **Scripted** (you run after prerequisites) |
| Demo UI copy | **Removed** from production-facing surfaces |
| SMS live gateway | **On hold** (UI retained) |
| Email verification at signup | **Deferred** (late phase) |
| Mock data provider | **Optional** (`VITE_DATA_PROVIDER=mock` for local only) |

**You must run** the listed SQL migrations in order and set `.env.local` with Supabase credentials for production testing.

---

## Phase 0 — Foundation & audit

### Deliverables

| Artifact | Purpose |
|----------|---------|
| [`docs/PRODUCTION_AUDIT.md`](PRODUCTION_AUDIT.md) | Route-by-route audit, statuses, gaps, table mapping |
| [`docs/IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | Phased roadmap (Phases 0–6) |
| [`.env.example`](../.env.example) | `VITE_DATA_PROVIDER`, Supabase URL/anon key |
| [`supabase/migrations/README.md`](../supabase/migrations/README.md) | Migration run order |
| [`supabase/migrations/CHECKLIST_001-005.md`](../supabase/migrations/CHECKLIST_001-005.md) | Step-by-step SQL checklist |

### Accomplished

- Full codebase inventory (routes, demo store, mock repository, no Supabase client initially).
- Identified production blockers: client-only auth, localStorage data, no RLS, no DB double-booking.
- Agreed principle: **preserve existing UI**; swap data layer via repositories.

---

## Phase 1 — Database schema (SQL scripts)

### Scripts created (manual execution in Supabase)

| File | Contents |
|------|----------|
| `001_extensions_and_types.sql` | `pgcrypto`, `btree_gist`, enums |
| `002_profiles_and_roles.sql` | `profiles`, roles, `handle_new_user` trigger |
| `002b_auth_signup_hardening.sql` | Public signup → **customer** only |
| `002c_backfill_auth_profiles.sql` | Backfill `profiles` for existing Auth users |
| `002d_profiles_read_own.sql` | RLS: read own profile |
| `003_vehicles.sql` | Fleet, images metadata, centavos pricing |
| `004_availability.sql` | Availability blocks / maintenance |
| `005_bookings.sql` | Bookings, status history, **overlap exclusion**, reference RPC |

### Accomplished (design)

- UUID PKs, `timestamptz`, money in **centavos** on vehicles/bookings.
- Booking reference generator `next_booking_reference()`.
- Database-level double-booking via partial **GiST exclusion** on active statuses.

### Your action

Run scripts in order; verify with each file’s queries. **We do not assume** your DB matches until you confirm.

---

## Phase 2 — Authentication & session

### App changes

| Component | Behavior |
|-----------|----------|
| `@supabase/supabase-js` | Installed |
| `AuthProvider` | Session restore, profile load |
| `authService` | Sign-in, register, reset password, sign-out |
| Login / register / forgot | Production forms when `VITE_DATA_PROVIDER=supabase` |
| `useSession()` | Supabase `profiles` → app `User` type |
| `Guard` / `useAppReady` | Auth loading + role redirects |
| Demo role switcher | Hidden when not in mock mode |
| `docs/PHASE2_AUTH.md` | Setup, admin SQL promotion, test checklist |

### Fixes shipped during rollout

- **Profile not found** after dashboard-created users → `002c` + `002d`.
- **Partner cannot add vehicle** (UUID not in demo store) → temporary profile mirror; superseded by Phase 3 vehicle writes to DB.

### Email & SMS (policy)

| Topic | Decision |
|-------|----------|
| Email confirmation | **Not required in Phase 2**; enable in late phase — [`docs/COMMUNICATIONS_ROADMAP.md`](COMMUNICATIONS_ROADMAP.md) |
| SMS | **On hold**; `/admin/sms` retained — same doc |

---

## Phase 3 — Supabase data (reads + vehicle writes)

### SQL added

| File | Contents |
|------|----------|
| `008_notifications.sql` | In-app `notifications` |
| `009_system_settings.sql` | Singleton settings row |
| `011_rls_phase3_core.sql` | RLS: profiles, vehicles, bookings read, blocks, settings |

### App changes

| Layer | Change |
|-------|--------|
| `src/services/supabase/` | `fetchSupabaseSnapshot()`, mappers, vehicle CRUD, maintenance blocks |
| `repositories` | Switches mock vs Supabase via `VITE_DATA_PROVIDER` |
| `useSnapshot()` | TanStack Query + `dataVersion` bump on mutations |
| Admin settings | Saves to `system_settings`; demo reset hidden in Supabase mode |
| `docs/PHASE3_DATA.md` | What reads/writes, troubleshooting |

### Accomplished

- Catalog, dashboards, calendars fed from **PostgreSQL** when provider is `supabase`.
- Partner **submit vehicle** → `vehicles` + `vehicle_images`, pending listing.
- Admin vehicle approve/edit/archive (soft delete).

---

## Phase 4 — Workflows (writes)

### SQL added

| File | Contents |
|------|----------|
| `006_payments.sql` | `payments` ledger |
| `007_phase4_workflows.sql` | Partner applications, favorites, inquiries; **booking notify trigger** |
| `011b_rls_phase4.sql` | Booking insert (customer/admin), payments, applications, favorites, inquiries |

### App workflows wired

| Workflow | Database |
|----------|----------|
| Customer booking (`/book`) | `bookings` + RPC reference + overlap error handling |
| Requires **customer sign-in** before confirm (Supabase) | |
| Admin booking status | `bookings` update + existing history trigger |
| Payments | record / verify / reject → `payments` + booking `payment_status` |
| Partner application | `partner_applications` |
| Contact / vehicle inquiry | `support_inquiries` |
| Favorites | `customer_favorites` |
| Notifications | Read + mark read; **insert on new booking** via DB trigger |
| Profile on book | Updates customer `profiles` (license, emergency contacts) |

### Documentation

- [`docs/PHASE4_DATA.md`](PHASE4_DATA.md) — SQL order + production test script.

### Not in Phase 4 (explicit)

- Public guest booking without login.
- License **file** upload to Storage.
- Vehicle **reviews** table.
- Live SMS send.
- Admin “create owner/partner” via Auth Admin API (manual SQL promotion still).
- Full admin manual booking form parity (if UI passes customer id, DB allows admin insert via RLS).

---

## Production copy (demo text removal)

### Accomplished

User-facing **“demo” / “demonstration” / simulated business** copy removed or replaced on:

- Public layout footer, home, cars, vehicle detail, booking, how-it-works/contact/partner copy.
- Rental terms and requirements in `constants/content.ts`.
- Booking flow: removed demo-only consent checkbox; production terms + pending messaging.
- Dashboard SMS copy (preview/on-hold, not “demo log”).
- Splash, 404, alt text, partner statement button label.

### Optional mock mode

`VITE_DATA_PROVIDER=mock` still enables desk login and demo reset **only if** you set it; default in `.env.example` is **`supabase`**.

---

## Migration run order (recommended master list)

Run in Supabase SQL Editor **in this order** (skip only if you know that file was already applied successfully):

1. `001_extensions_and_types.sql`
2. `002_profiles_and_roles.sql`
3. `002b_auth_signup_hardening.sql`
4. `002c_backfill_auth_profiles.sql` *(if Auth users existed before 002)*
5. `002d_profiles_read_own.sql`
6. `003_vehicles.sql`
7. `004_availability.sql`
8. `005_bookings.sql`
9. `008_notifications.sql`
10. `009_system_settings.sql`
11. `011_rls_phase3_core.sql`
12. `006_payments.sql`
13. `007_phase4_workflows.sql`
14. `011b_rls_phase4.sql`

*(006/007 can run before 011 if you prefer, but **011 + 011b** must be in place before production app access.)*

---

## Environment

```env
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Supabase Auth: **Confirm email OFF** until communications phase.

---

## Suggested production test script

1. **Customer** register/login → book approved vehicle → note reference (pending).
2. **Admin** see booking + notification → confirm → customer notification updates on refresh.
3. **Admin** record payment → verify → booking payment status **paid**.
4. **Partner** submit vehicle → **Admin** approve listing → vehicle on `/cars`.
5. **Partner apply** on public form → row in admin partner applications (when admin can list).
6. **Overlapping booking** same vehicle → database rejection message.
7. **Favorite** heart on catalog (signed-in customer).

---

## Phases not started (planned)

| Phase | Focus |
|-------|--------|
| **5** | Revenue rules, reports from SQL, partner earnings / statements from DB |
| **6** | SMS gateway, email verification, Storage for proofs/images, security hardening, Vercel prod deploy |

---

## Key file map (implementation)

| Area | Path |
|------|------|
| Config | `src/lib/config.ts` |
| Supabase client | `src/lib/supabase/client.ts` |
| Auth | `src/services/auth/authService.ts`, `src/providers/AuthProvider.tsx` |
| Data facade | `src/services/index.ts` |
| Supabase repo | `src/services/supabase/repository.ts`, `snapshot.ts`, `bookings.ts`, `payments.ts`, … |
| Hooks | `src/hooks/useDemo.ts` (session, snapshot, actions) |
| Migrations | `supabase/migrations/*.sql` |

---

## Sign-off checklist

- [ ] All SQL migrations above executed without errors.
- [ ] Admin account promoted via SQL (`002c` / `PHASE2_AUTH.md`).
- [ ] `.env.local` points to your Supabase project.
- [ ] Production test script passed.
- [ ] RLS verified (no empty data due to denied select).

---

*This report reflects repository state as of 2026-11-17. Database “live” status depends on your executed migrations, not this document alone.*