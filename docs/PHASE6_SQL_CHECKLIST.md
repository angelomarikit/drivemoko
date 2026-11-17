# Phase 6 SQL checklist

Run in **Supabase SQL Editor** in order. Do not skip Phase 5 if settlements are required.

| Step | File | Verify |
|------|------|--------|
| 1 | `016_storage_buckets.sql` | 5 buckets listed |
| 2 | `017_storage_policies.sql` | Policies on `storage.objects` |
| 3 | `018_rental_inspections.sql` | `rental_inspections` tables |
| 4 | `019_rental_extensions.sql` | `approve_booking_extension` |
| 5 | `020_notification_outbox.sql` | `notification_outbox` |
| 6 | `021_production_security_hardening.sql` | `admin_provision_profile` |
| 7 | `PHASE6_VERIFICATION.sql` | All checks return expected rows |

**Pre-flight (production data):**

```sql
select count(*) as bookings from public.bookings;
select count(*) as profiles from public.profiles;
```

**Post-flight sample:**

```sql
select id, public from storage.buckets order by id;
select count(*) from public.notification_outbox;
```