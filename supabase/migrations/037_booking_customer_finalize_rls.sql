-- Customers must update their own pending bookings after insert (documents + contract paths).
-- Without this, the public confirm step can insert the row then fail on update, showing an error
-- even though admin already sees the booking.

drop policy if exists "bookings_update_customer_pending" on public.bookings;

create policy "bookings_update_customer_pending"
  on public.bookings for update to authenticated
  using (customer_id = auth.uid() and status = 'pending')
  with check (customer_id = auth.uid() and status = 'pending');

comment on policy bookings_update_customer_pending on public.bookings is
  'Guest/customer checkout: attach renter docs and signed contract on pending bookings.';