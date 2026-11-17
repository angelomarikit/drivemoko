-- Run after 013–015 to verify Phase 5 schema (safe read-only checks)

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'partner_agreements', 'partner_earnings', 'partner_settlements',
    'partner_settlement_lines', 'refunds', 'payment_audit_log', 'payments'
  )
order by 1;

select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'resolve_partner_share_bps', 'sync_booking_payment_status',
    'create_partner_settlement', 'mark_settlement_paid'
  )
order by 1;

-- Sample financial summary (admin SQL editor)
select
  (select count(*) from public.bookings where status = 'completed') as completed_bookings,
  (select coalesce(sum(amount_centavos), 0) from public.payments where status = 'verified') as verified_payments_centavos,
  (select count(*) from public.partner_earnings) as partner_earning_rows,
  (select count(*) from public.partner_settlements where status = 'paid') as paid_settlements;