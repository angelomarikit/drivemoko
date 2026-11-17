# Supabase migrations — manual execution guide

Drive Moko production schema is applied **manually** in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).

**Do not run these against production until reviewed.**  
**Do not assume migrations were applied until verification queries succeed.**

---

## Execution order

| Order | File (planned) | Purpose |
|-------|----------------|---------|
| 1 | `001_extensions_and_types.sql` | Extensions, enums |
| 2 | `002_profiles_and_roles.sql` | Profiles linked to `auth.users`, roles |
| 3 | `003_vehicles.sql` | Fleet catalog, listing status |
| 4 | `004_availability.sql` | Blocks / maintenance windows |
| 5 | `005_bookings.sql` | Bookings, history, **overlap prevention** |
| 6 | `006_payments.sql` | Payments (centavos), proofs |
| 7 | `007_partners.sql` | Applications, agreements, earnings |
| 8 | `008_notifications_sms.sql` | Notifications, SMS |
| 9 | `009_settings_inquiries.sql` | Settings, inquiries |
| 10 | `010_storage_buckets.sql` | Private buckets + policies |
| 11 | `011_rls_policies.sql` | Row Level Security |
| 12 | `012_functions_triggers.sql` | References, audits, `updated_at` (optional) |
| 13 | `006_payments.sql` | Payments (centavos) — Phase 4 |
| 14 | `007_phase4_workflows.sql` | Workflows — Phase 4 |
| 15 | `011b_rls_phase4.sql` | Phase 4 RLS |
| 16 | `013_phase5_financial.sql` | Earnings, settlements, refunds, payment sync |
| 17 | `014_phase5_rls_financial.sql` | Phase 5 RLS |
| 18 | `015_phase5_settlement_functions.sql` | Settlement RPCs |
| — | `PHASE5_VERIFICATION.sql` | Read-only checks after Phase 5 |
| 19 | `016_storage_buckets.sql` | Phase 6 storage buckets |
| 20 | `017_storage_policies.sql` | Storage RLS |
| 21 | `018_rental_inspections.sql` | Check-out / return |
| 22 | `019_rental_extensions.sql` | Extensions + late fees |
| 23 | `020_notification_outbox.sql` | Email/SMS outbox |
| 24 | `021_production_security_hardening.sql` | Provision + grants |
| 25 | `022_partner_registration.sql` | Partner contract fields + `admin_finalize_partner_profile` |
| — | `022b_partner_finalize_profile_fields.sql` | Re-run function only if 022 was applied before profile-field args existed |
| 26 | `023_rental_packages.sql` | Tiered rental package defaults + per-vehicle rates |
| — | `PHASE6_VERIFICATION.sql` | Phase 6 checks |

> **Status (2026-11-17):** Migrations through **022** are in repo. Apply in dependency order; use `docs/PHASE6_SQL_CHECKLIST.md` and `docs/PHASE5_STEP1_VERIFICATION.md`.

---

## How to run

1. Open Supabase → **SQL** → **New query**.
2. Paste the full contents of one migration file.
3. Click **Run**.
4. Run the **verification** block at the bottom of that file (when provided).
5. Proceed to the next file only if verification passes.

---

## Global verification (after 011–012)

```sql
-- Tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

-- RLS enabled on app tables
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by relname;
```

---

## Rollback policy

- No automatic down migrations.
- Destructive changes require explicit approval and a backup.
- Prefer additive migrations (`alter table ... add column`) after go-live.

---

## App integration

After schema + RLS:

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
2. Set `VITE_DATA_PROVIDER=supabase` (when implemented).
3. Create first admin via documented provisioning script (not public register).

See `docs/IMPLEMENTATION_PLAN.md`.