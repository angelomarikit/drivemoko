-- Drive Moko — 011b RLS Phase 4 (run after 011, 006, 007, 008)
-- Requires: 011_rls_phase3_core.sql

-- Bookings: customers create own; admin manages all
drop policy if exists "bookings_insert_customer" on public.bookings;
create policy "bookings_insert_customer"
  on public.bookings for insert to authenticated
  with check (customer_id = auth.uid());

drop policy if exists "bookings_insert_admin" on public.bookings;
create policy "bookings_insert_admin"
  on public.bookings for insert to authenticated
  with check (public.is_admin());

drop policy if exists "bookings_update_admin" on public.bookings;

create policy "bookings_update_admin"
  on public.bookings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Payments
alter table public.payments enable row level security;

drop policy if exists "payments_select_scoped" on public.payments;
create policy "payments_select_scoped"
  on public.payments for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );

drop policy if exists "payments_insert_admin" on public.payments;
create policy "payments_insert_admin"
  on public.payments for insert to authenticated
  with check (public.is_admin());

drop policy if exists "payments_update_admin" on public.payments;
create policy "payments_update_admin"
  on public.payments for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Partner applications: public insert; admin read/update
alter table public.partner_applications enable row level security;

drop policy if exists "partner_applications_insert_anon" on public.partner_applications;
create policy "partner_applications_insert_all"
  on public.partner_applications for insert
  with check (true);

drop policy if exists "partner_applications_select_admin" on public.partner_applications;
create policy "partner_applications_select_admin"
  on public.partner_applications for select to authenticated
  using (public.is_admin());

drop policy if exists "partner_applications_update_admin" on public.partner_applications;
create policy "partner_applications_update_admin"
  on public.partner_applications for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Favorites
alter table public.customer_favorites enable row level security;

drop policy if exists "favorites_own" on public.customer_favorites;
create policy "favorites_select_own"
  on public.customer_favorites for select to authenticated
  using (user_id = auth.uid());

create policy "favorites_mutate_own"
  on public.customer_favorites for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inquiries: anyone insert; admin read
alter table public.support_inquiries enable row level security;

create policy "inquiries_insert_all"
  on public.support_inquiries for insert
  with check (true);

create policy "inquiries_select_admin"
  on public.support_inquiries for select to authenticated
  using (public.is_admin());

-- Notifications: allow trigger (definer) + users read own (already in 011)
drop policy if exists "notifications_insert_definer" on public.notifications;
-- inserts via notify_booking_pending (security definer) — no client insert policy needed

select tablename, policyname from pg_policies
where schemaname = 'public' and tablename in ('bookings', 'payments', 'partner_applications', 'customer_favorites')
order by tablename, policyname;