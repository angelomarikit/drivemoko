-- Allow customers to update their own pending booking (retry confirm: contract, notes, pricing snapshot).

drop policy if exists "bookings_update_customer_pending" on public.bookings;

create policy "bookings_update_customer_pending"
  on public.bookings for update to authenticated
  using (customer_id = auth.uid() and status = 'pending')
  with check (customer_id = auth.uid() and status = 'pending');