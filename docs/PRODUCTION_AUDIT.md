# Drive Moko — Production audit

**Audit date:** 2026-11-17  
**Codebase:** `C:\Users\Toptier\Desktop\drivemoko`  
**Auditor method:** Source inspection + prior browser QA (`QA-WALKTHROUGH.md`, Nov 16 2026). Items marked **TESTED** were exercised in the dev app; others are **CODE REVIEW** unless noted.

**Current runtime mode:** 100% client-side demo — Zustand persist (`drivemoko-demo-v2`), `src/data/seed.ts`, `src/stores/demoStore.ts`, `src/services/mock/demoRepository.ts`.  
**Supabase:** Not installed (`@supabase/supabase-js` absent). `src/services/supabase/index.ts` throws if called. `src/services/index.ts` hardcodes `provider = 'mock'`.

---

## Executive summary

| Area | Status | Production blocker |
|------|--------|-------------------|
| UI / routes / layouts | PARTIALLY WORKING | Demo auth & data layer |
| Public booking funnel | PARTIALLY WORKING | No real auth, payments, or persistence |
| Admin operations | PARTIALLY WORKING | All data in localStorage |
| Owner / partner / customer dashboards | PARTIALLY WORKING | Scoped in-memory only |
| Security | NOT IMPLEMENTED | No server-side authz; role = client store |
| Database | NOT IMPLEMENTED | No PostgreSQL / Supabase |
| Double-booking prevention | PARTIALLY WORKING | In-app rules only; no DB constraints |
| SMS / payments | NOT IMPLEMENTED (prod) | Simulated / manual demo only |

**Preserve for production:** Existing pages, `DashboardLayout`, public site design, repository interface shape (`src/services/repositories/types.ts`), booking status machine in `src/utils/bookingRules.ts`, pricing in `src/utils/pricing.ts`, availability utilities, FullCalendar UI (recent Google-style pass).

---

## Technology inventory

| Item | Finding |
|------|---------|
| React 19 + Vite 7 + TS strict | WORKING (build passes) |
| Tailwind v4 (`@tailwindcss/vite`) | WORKING |
| React Router 7 | WORKING |
| Zustand + persist | WORKING (demo DB) |
| TanStack Query | WORKING (snapshot invalidation via `version`) |
| RHF + Zod | WORKING on forms audited |
| Radix UI | WORKING (no full shadcn kit in `package.json`; custom `Button`, `Modal`, `Fields`) |
| Recharts | WORKING (KPIs from computed metrics) |
| FullCalendar 6 | WORKING on calendar routes |
| Supabase | NOT IMPLEMENTED |

---

## Authentication & authorization

| Route / feature | Role | Purpose | Status | Notes | DB / security |
|-----------------|------|---------|--------|-------|----------------|
| `/login` | Public | Sign in | PARTIALLY WORKING | **TESTED:** picks predefined demo user IDs; no password | NEEDS DATABASE + Supabase Auth |
| `/register` | Public | Customer signup | PARTIALLY WORKING | Creates row in `demoStore.users`; no email verify | NEEDS DATABASE |
| `/forgot-password` | Public | Reset password | NOT IMPLEMENTED | Toast only (`AuthPages.tsx`) | NEEDS DATABASE |
| `Guard` + `useSession` | All dashboards | Route protection | PARTIALLY WORKING | Role from persisted `sessionUserId` only | NEEDS SECURITY REVIEW |
| Demo role switcher | Dashboard header | Impersonation | BROKEN for prod | Must remove for production | NEEDS SECURITY REVIEW |
| `homeForRole` redirect | Auth | Post-login routing | WORKING (demo) | CODE REVIEW | KEEP logic; wire to DB role |

**Permissions today:** Enforced in UI via `scopedBookings` / `scopedVehicles` (`src/utils/metrics.ts`). Not enforceable against tampering.

---

## Public website

| Route | Role | Purpose | Components | Expected | Status | Working | Broken / missing | Tables (prod) | Priority |
|-------|------|---------|------------|----------|--------|---------|------------------|---------------|----------|
| `/` | Public | Marketing + search | `HomePage` | Search → `/cars` | PARTIALLY WORKING | **TESTED** hero, widget, nav | Demo disclaimer copy | `vehicles`, `locations` | P1 |
| `/cars` | Public | Catalog | `CarsPage`, availability modal | Filter, book, calendar | PARTIALLY WORKING | **TESTED** filters, hero | Stock images; seed vehicles | `vehicles`, `vehicle_images` | P1 |
| `/cars/:id` | Public | Vehicle detail | `VehicleDetailPage` | Book, inquire, calendar | PARTIALLY WORKING | **TESTED** | Reviews from seed | `vehicles`, `reviews`, `bookings` (avail) | P1 |
| `/book/:vehicleId` | Public | 4-step booking | `BookingPage` | Pending booking | PARTIALLY WORKING | **TESTED** flow, ref increment | Guest → customer login hack; no payment | `bookings`, `profiles` | P0 |
| `/how-it-works` | Public | Info | `InfoPages` | Static | WORKING | CONTENT | — | — | P3 |
| `/become-a-partner` | Public | Partner apply | `InfoPages` | → admin pending | PARTIALLY WORKING | **TESTED** (seed app) | Demo applications in store | `partner_applications` | P1 |
| `/about`, `/contact` | Public | Info / inquire | `InfoPages` | Forms | PARTIALLY WORKING | CODE REVIEW | Inquiries not emailed | `support_inquiries` | P2 |

---

## Administrator (`/admin/*`)

| Route | Purpose | Status | Working (demo) | Gaps for production | Required tables | Priority |
|-------|---------|--------|----------------|---------------------|-----------------|----------|
| `/admin` | KPIs, charts, quick actions | PARTIALLY WORKING | **TESTED** empty states; metrics from store | KPIs not from Supabase; deltas are synthetic | `bookings`, `payments`, `profiles` | P0 |
| `/admin/bookings` | Booking CRUD + status | PARTIALLY WORKING | **TESTED** list, create modal, detail | No server concurrency; references client-generated | `bookings`, `booking_status_history` | P0 |
| `/admin/vehicles` | Fleet CRUD, approve Wigo | PARTIALLY WORKING | **TESTED** list, block dates, archive | Images local/demo paths; no Storage | `vehicles`, `vehicle_images`, `vehicle_availability_blocks` | P0 |
| `/admin/calendar` | Schedule + book UI | PARTIALLY WORKING | **TESTED** Google-style UI, drag-to-book → `/book` | Events from local bookings only | `bookings`, blocks | P1 |
| `/admin/owners` | Owner directory | PARTIALLY WORKING | **TESTED** | Create user in memory | `profiles`, `owner_profiles` | P1 |
| `/admin/partners` | Partners + applications | PARTIALLY WORKING | **TESTED** Anna Reyes pending | Approval creates partner user client-side | `partner_applications`, `profiles` | P1 |
| `/admin/customers` | Customer directory | PARTIALLY WORKING | **TESTED** | Suspend is local only | `profiles` | P2 |
| `/admin/payments` | Record / verify | PARTIALLY WORKING | **TESTED** empty ledger | No proof upload to Storage | `payments`, `payment_proofs` | P0 |
| `/admin/reports` | Charts / utilization | PARTIALLY WORKING | **TESTED** zeros | Revenue = derived from payments in metrics | `payments`, `bookings` | P1 |
| `/admin/sms` | Templates + log | NOT IMPLEMENTED (prod) | Templates editable; send is **simulated** | No gateway | `sms_templates`, `sms_logs` | P2 |
| `/admin/settings` | Rates, flags, **reset demo** | PARTIALLY WORKING | **TESTED** | **Reset / full seed must be removed** in prod | `system_settings` | P0 |

**Booking workflow (`bookingRules.ts`):** Transitions `pending → confirmed → ongoing → completed` implemented in `demoStore`. **CODE REVIEW.** Cancellations/rejections clear calendar per rules. **No DB transaction or exclusion constraint.**

---

## Car owner (`/owner/*`)

| Route | Status | Working | Gaps | Priority |
|-------|--------|---------|------|----------|
| `/owner` | PARTIALLY WORKING | **TESTED** scoped KPIs, 4 vehicles | Earnings from computed mock | P1 |
| `/owner/vehicles` | PARTIALLY WORKING | **TESTED** edit, block dates | No image upload to cloud | P1 |
| `/owner/bookings` | PARTIALLY WORKING | **TESTED** scoped list | Read-only transitions vs admin | P1 |
| `/owner/calendar` | PARTIALLY WORKING | **TESTED** | Same as admin calendar scoped | P1 |
| `/owner/earnings`, `/owner/reports` | PARTIALLY WORKING | CODE REVIEW | Same `ReportsBoard` | P2 |
| `/owner/settings` | PARTIALLY WORKING | **TESTED** profile save local | No password change | P2 |

---

## Links / partner (`/partner/*`)

| Route | Status | Working | Gaps | Priority |
|-------|--------|---------|------|----------|
| `/partner` | PARTIALLY WORKING | **TESTED** share rate 70% from settings | Hardcoded default in seed | P1 |
| `/partner/vehicles` | PARTIALLY WORKING | **TESTED** submit → pending | Admin approval flow demo-only | P1 |
| `/partner/reservations` | PARTIALLY WORKING | **TESTED** | Scoped bookings | P1 |
| `/partner/calendar` | PARTIALLY WORKING | **TESTED** | — | P1 |
| `/partner/earnings` | PARTIALLY WORKING | CODE REVIEW | Partner share from `settings.defaultPartnerShare` | P1 |
| `/partner/statements` | NOT IMPLEMENTED (prod) | CSV **download demo statement** client-side | Not financial system of record | P2 |
| `/partner/settings` | PARTIALLY WORKING | **TESTED** | — | P2 |

---

## Customer (`/customer/*`)

| Route | Status | Working | Gaps | Priority |
|-------|--------|---------|------|----------|
| `/customer` | PARTIALLY WORKING | **TESTED** | Favorites empty on minimal seed | P2 |
| `/customer/bookings` | PARTIALLY WORKING | **TESTED** | Own bookings only via scope | P0 |
| `/customer/favorites` | PARTIALLY WORKING | **TESTED** | Persisted favorites in store | P2 |
| `/customer/notifications` | PARTIALLY WORKING | **TESTED** empty | Seed notifications for admin, not Maria | P2 |
| `/customer/profile` | PARTIALLY WORKING | **TESTED** | No auth profile sync | P2 |

---

## Cross-cutting systems

### Data persistence

| Item | Status | Detail |
|------|--------|--------|
| Primary store | BROKEN for prod | `localStorage` `drivemoko-demo-v2` |
| Seed data | NEEDS REMOVAL (prod) | `createMinimalSeed` / `createFullSeed` |
| Repository pattern | WORKING | Swap target ready; only mock impl |
| TanStack Query | PARTIALLY WORKING | Tied to Zustand `version` |

### Booking reference generation

| Item | Status | Detail |
|------|--------|--------|
| `DM-2026-NNNN` | PARTIALLY WORKING | `bookingSeq` in client store — race risk multi-user |

### Availability & double booking

| Item | Status | Detail |
|------|--------|--------|
| `scheduleIssues` | PARTIALLY WORKING | In-memory overlap with bookings + maintenance blocks |
| `vehicleDayMap` / UI disable | WORKING | Public + book flow |
| PostgreSQL exclusion / locking | NOT IMPLEMENTED | **P0 for production** |

### Payments & revenue reporting

| Item | Status | Detail |
|------|--------|--------|
| Record / verify / reject | PARTIALLY WORKING | Demo store updates `paymentStatus` on booking |
| Revenue KPIs | PARTIALLY WORKING | `metrics.ts` — verified payments; not audited against accounting rules |
| Proof uploads | NOT IMPLEMENTED | No Storage |
| Money type | NEEDS SECURITY REVIEW | `number` peso floats in TS; spec requires integer centavos in DB |

### Notifications & SMS

| Item | Status | Detail |
|------|--------|--------|
| In-app notifications | PARTIALLY WORKING | Fan-out on booking events in `demoStore` |
| SMS | NOT IMPLEMENTED | `status: 'simulated'` only |

### Files & images

| Item | Status | Detail |
|------|--------|--------|
| Vehicle images | PARTIALLY WORKING | `/public` paths + optional resize preview on vehicle form |
| License on booking | NOT IMPLEMENTED | Browser preview only; not uploaded |

---

## Demo / mock inventory (remove or gate for production)

| Location | Behavior |
|----------|----------|
| `AuthPages` | Demo desks, no passwords |
| `DashboardLayout` | “Switch demo role” dropdown |
| `demoStore.resetDemo` / `resetDemoFull` | Settings board |
| `seed.ts` | Fictional users, vehicles, optional full history |
| `PublicLayout` | Demo legal notice |
| `SmsBoard` | Simulated send |
| `StatementsBoard` | Demo CSV |
| `BookingPage` | `demoConsent` checkbox |
| Login splash copy | “Loading Drive Moko demo…” |

**Strategy:** Feature flag `VITE_DATA_PROVIDER=mock|supabase` for dev; production builds use `supabase` only. Remove UI affordances when `supabase`.

---

## Status legend (per your spec)

- **WORKING** — Meets intent in demo mode, code path complete.
- **PARTIALLY WORKING** — UI works; wrong data layer or missing production behavior.
- **BROKEN** — Errors or misleading behavior.
- **NOT IMPLEMENTED** — Placeholder or explicit non-feature.
- **NEEDS DATABASE** — Requires Supabase schema + repositories.
- **NEEDS SECURITY REVIEW** — RLS, auth, or privilege escalation risk.
- **TESTED** — Verified in browser (see `QA-WALKTHROUGH.md`).

---

## Verification gaps (honest)

The following were **not** re-tested on 2026-11-17: full booking approve → pay → complete cross-role script on fresh minimal seed; payment reject edge cases; partner approval creating auth user; vehicle image upload; week/day FullCalendar views under load.

Recommend repeating cross-role script against Supabase staging after Phase 2.

---

## Recommended Supabase table mapping (from current types)

| Current TS entity | Proposed tables |
|-------------------|-----------------|
| `User` | `profiles` + role assignment table linked to `auth.users` |
| `Vehicle` | `vehicles`, `vehicle_images`, optional `vehicle_documents` |
| `Booking` | `bookings`, `booking_addons`, `booking_status_history` |
| `Payment` | `payments`, `payment_verifications`, `payment_proofs` |
| `MaintenanceWindow` | `vehicle_availability_blocks` or `vehicle_maintenance_records` |
| `PartnerApplication` | `partner_applications` |
| `Notification` | `notifications` |
| `SmsTemplate` / `SmsLog` | `sms_templates`, `sms_logs` |
| `Review` | `vehicle_reviews` (moderation) |
| `Settings` (store) | `system_settings` (singleton or key-value) |
| `Inquiry` | `support_inquiries` |

Detailed DDL: see `supabase/migrations/` (to be applied manually in SQL Editor).