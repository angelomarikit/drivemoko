# Phase 5 — Step 1: Integration verification (no destructive ops)

Run these in **Supabase SQL Editor** after migrations **001–005**, **002b/c/d**, **008**, **009**, **011**, **006**, **007**, **011b**, and (for Phase 5) **013 → 014 → 015**.

## Migration dependency chain

| Migration | Depends on |
|-----------|------------|
| `013_phase5_financial.sql` | `006_payments`, `007_phase4_workflows`, `partner_profiles`, `system_settings`, `bookings`, `vehicles` |
| `014_phase5_rls_financial.sql` | `013`, `public.is_admin()` from Phase 3 RLS |
| `015_phase5_settlement_functions.sql` | `013`, `014` |

## 1. Tables present

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'payments', 'bookings', 'partner_profiles', 'system_settings',
    'partner_agreements', 'partner_earnings', 'partner_settlements',
    'partner_settlement_lines', 'refunds', 'payment_audit_log'
  )
order by 1;
```

Expected: one row per table after Phase 5.

## 2. Functions / RPCs

```sql
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'resolve_partner_share_bps', 'sync_booking_payment_status',
    'create_partner_settlement', 'mark_settlement_paid'
  )
order by 1;
```

## 3. RLS policies (financial)

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'partner_agreements', 'partner_earnings', 'partner_settlements',
    'partner_settlement_lines', 'refunds', 'payment_audit_log', 'payments'
  )
order by tablename, policyname;
```

**Security expectations**

- Only **admins** verify payments (existing `011b` + payment policies).
- **Partners** can **select** own `partner_earnings` / `partner_settlements`; cannot update share rows.
- Settlements are created/marked paid via **security definer** RPCs (`015`), not direct partner writes.

## 4. Booking / payment workflow

```sql
select id, reference, status, payment_status, pricing_total_centavos
from public.bookings
order by created_at desc
limit 10;

select booking_id, status, amount_centavos, verified_by
from public.payments
order by created_at desc
limit 10;
```

After verifying payments in the app, `payment_status` on bookings should become `paid` or `partial` via `sync_booking_payment_status` (not hard-coded `paid` in the client).

## 5. Partner earnings on completion

```sql
select b.reference, b.status, pe.partner_share_centavos, pe.status as earning_status
from public.bookings b
left join public.partner_earnings pe on pe.booking_id = b.id
where b.status = 'completed'
order by b.created_at desc
limit 20;
```

Completed bookings on **partner-listed vehicles** should have a `partner_earnings` row (trigger in `013`).

## 6. Demo store coupling (app layer)

| Area | Supabase source | Mock fallback |
|------|-----------------|---------------|
| Admin/owner/partner KPI charts | `payments`, `bookings` snapshot | `demoStore` + `metrics.ts` |
| Partner earnings UI | `partner_earnings`, `partner_settlements` | `shareAmount()` on bookings |
| Settlements admin | RPC `create_partner_settlement` / `mark_settlement_paid` | N/A (message in UI) |

`VITE_DATA_PROVIDER=supabase` must be set for database-backed financial pages.

## 7. Full checklist script

Use `supabase/migrations/PHASE5_VERIFICATION.sql` after **013–015**.