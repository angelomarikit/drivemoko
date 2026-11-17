# Supabase SQL checklist — migrations 001–005

Use this on a **new** Supabase project (or empty `public` schema).  
**Do not skip order.** **Do not run 006+ yet** (RLS not included in 001–005).

---

## Before you start

- [ ] Supabase project created (note **Project URL** and **anon key** for later app work).
- [ ] Dashboard → **SQL** → **New query** ready.
- [ ] This is **not** production data yet — safe to use a **dev/staging** project first.
- [ ] Optional backup: if `public` already has tables, stop and review with dev before running 001–005.

---

## 001 — `001_extensions_and_types.sql`

- [ ] Open file, copy **entire** contents into SQL Editor.
- [ ] **Run** — no errors in Results panel.
- [ ] Run verification (at bottom of file) — expect **4 rows**: `app_role`, `booking_status`, `listing_status`, `payment_record_status`.
- [ ] Spot-check: **Database → Extensions** shows `pgcrypto` and `btree_gist` enabled (or query `select * from pg_extension where extname in ('pgcrypto','btree_gist');`).

**Pass:** enums exist; extensions enabled.

---

## 002 — `002_profiles_and_roles.sql`

- [ ] Run full file after 001 succeeded.
- [ ] **Run** — no errors.
- [ ] Verification query — expect tables: `owner_profiles`, `partner_profiles`, `profiles`, `user_roles` (4 rows).
- [ ] **Database → Database → Triggers** (or query): trigger `on_auth_user_created` on `auth.users` exists.
- [ ] Optional: **Authentication → Sign up** enabled if you will test signup later (not required for DDL only).

**Pass:** `profiles` + related tables exist; `handle_new_user` trigger attached.

**Note:** New Auth signups will insert a row into `public.profiles` automatically.

---

## 003 — `003_vehicles.sql`

- [ ] Run full file after 002 succeeded.
- [ ] **Run** — no errors.
- [ ] `select count(*) from vehicle_categories;` → **6**.
- [ ] Column check in verification → `price_per_day_centavos` (**bigint**), `listing_status` (enum).
- [ ] Tables present: `vehicles`, `vehicle_images`, `vehicle_documents`, `vehicle_approval_history`.

**Pass:** vehicle catalog schema ready; money stored in centavos on vehicles.

---

## 004 — `004_availability.sql`

- [ ] Run full file after 003 succeeded.
- [ ] **Run** — no errors.
- [ ] Verification — tables: `vehicle_availability_blocks`, `vehicle_maintenance_records`.

**Pass:** owner/maintenance blocks can be stored.

---

## 005 — `005_bookings.sql`

- [ ] Run full file after 004 succeeded.
- [ ] **Run** — no errors (needs **`btree_gist`** from 001).
- [ ] Verification — `bookings_no_overlap` constraint exists.
- [ ] Verification — functions: `next_booking_reference`, `bookings_set_blocks_calendar`.
- [ ] Extra checks (recommended):

```sql
-- Tables
select table_name from information_schema.tables
where table_schema = 'public' and table_name in (
  'bookings', 'booking_status_history', 'booking_reference_counters'
)
order by 1;

-- Reference generator (does not need real vehicle/customer)
select public.next_booking_reference(2026);
select public.next_booking_reference(2026);
-- Expect: DM-2026-0001 then DM-2026-0002
```

**Pass:** bookings + overlap exclusion + reference counter work.

**Overlap test (optional, after you have test profile + vehicle UUIDs):**

- [ ] Insert one booking with `status = 'confirmed'`, valid `pickup_at` / `return_at`.
- [ ] Try second booking on **same vehicle** with overlapping range → must **fail** with exclusion violation.
- [ ] Set second booking `status = 'cancelled'` or `blocks_calendar = false` per rules → overlap allowed for non-blocking rows.

---

## 002b — `002b_auth_signup_hardening.sql` (Phase 2 auth)

- [ ] Run after **002** (safe to re-run — replaces `handle_new_user`).
- [ ] Verification query returns `customer_only_role = true`.
- [ ] Required before public customer registration in production.

---

## After all five pass

- [ ] Save verification query results (screenshot or paste) for Phase 2 integration.
- [ ] **Do not** expose this schema to the React app in production until **011 RLS** migrations exist.
- [ ] Copy secrets to local `.env.local` (from `.env.example`) when app integration starts — keep `VITE_DATA_PROVIDER=mock` until repositories are wired.
- [ ] Tell dev team: ready for **006–012** (payments, partners, notifications, storage, **RLS**).

---

## If something fails

| Error type | Likely cause |
|------------|----------------|
| `type "app_role" already exists` | 001 run twice — use fresh DB or drop types only with care (dev only). |
| `relation "profiles" already exists` | 002 run twice — do not re-run whole file; fix manually or reset dev project. |
| `function btree_gist...` / exclusion fails | 001 not run or `btree_gist` disabled. |
| FK error on `bookings` | 003/002 missing or empty `vehicles` / `profiles` on insert tests. |
| `deleted_at` / constraint errors | Ensure you use latest `005_bookings.sql` from repo (not an old copy). |

---

## File run order (quick reference)

1. `001_extensions_and_types.sql`
2. `002_profiles_and_roles.sql`
3. `003_vehicles.sql`
4. `004_availability.sql`
5. `005_bookings.sql`

See also: [`README.md`](README.md) · [`docs/IMPLEMENTATION_PLAN.md`](../../docs/IMPLEMENTATION_PLAN.md)