-- Drive Moko — 014 Phase 5 financial RLS
-- Requires: 013_phase5_financial.sql, public.is_admin()

alter table public.partner_agreements enable row level security;
alter table public.partner_earnings enable row level security;
alter table public.partner_settlements enable row level security;
alter table public.partner_settlement_lines enable row level security;
alter table public.refunds enable row level security;
alter table public.payment_audit_log enable row level security;

-- Agreements: admin all; partner read own
create policy "agreements_admin_all"
  on public.partner_agreements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "agreements_partner_read"
  on public.partner_agreements for select to authenticated
  using (partner_id = auth.uid());

-- Earnings: partner own; admin all
create policy "earnings_admin_all"
  on public.partner_earnings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "earnings_partner_read"
  on public.partner_earnings for select to authenticated
  using (partner_id = auth.uid());

-- Settlements
create policy "settlements_admin_all"
  on public.partner_settlements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "settlements_partner_read"
  on public.partner_settlements for select to authenticated
  using (partner_id = auth.uid());

create policy "settlement_lines_admin"
  on public.partner_settlement_lines for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "settlement_lines_partner_read"
  on public.partner_settlement_lines for select to authenticated
  using (
    exists (
      select 1 from public.partner_settlements s
      where s.id = settlement_id and s.partner_id = auth.uid()
    )
  );

-- Refunds: admin only
create policy "refunds_admin"
  on public.refunds for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Payment audit: admin read
create policy "payment_audit_admin"
  on public.payment_audit_log for select to authenticated
  using (public.is_admin());

select tablename, policyname from pg_policies
where schemaname = 'public' and tablename like 'partner_%'
order by tablename, policyname;