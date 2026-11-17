-- Drive Moko — 015 settlement RPCs (admin only via RLS + is_admin check inside)

create or replace function public.create_partner_settlement(
  p_partner_id uuid,
  p_period_start date,
  p_period_end date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  settlement_id uuid;
  total bigint := 0;
  rec record;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can create settlements.';
  end if;
  insert into public.partner_settlements (partner_id, period_start, period_end, created_by, status)
  values (p_partner_id, p_period_start, p_period_end, auth.uid(), 'draft')
  returning id into settlement_id;

  for rec in
    select id, partner_share_centavos
    from public.partner_earnings
    where partner_id = p_partner_id
      and status = 'payable'
      and recognized_at::date >= p_period_start
      and recognized_at::date <= p_period_end
      and not exists (select 1 from public.partner_settlement_lines l where l.earning_id = partner_earnings.id)
  loop
    insert into public.partner_settlement_lines (settlement_id, earning_id, partner_share_centavos)
    values (settlement_id, rec.id, rec.partner_share_centavos);
    update public.partner_earnings set status = 'in_settlement' where id = rec.id;
    total := total + rec.partner_share_centavos;
  end loop;

  update public.partner_settlements set total_partner_centavos = total where id = settlement_id;
  return settlement_id;
end;
$$;

create or replace function public.mark_settlement_paid(
  p_settlement_id uuid,
  p_payout_reference text,
  p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can mark settlements paid.';
  end if;
  update public.partner_settlements
  set status = 'paid', payout_reference = coalesce(p_payout_reference, ''), paid_at = now(), paid_by = auth.uid(), notes = coalesce(p_notes, notes)
  where id = p_settlement_id and status = 'draft';
  if not found then
    raise exception 'Settlement not found or already paid.';
  end if;
  update public.partner_earnings e
  set status = 'settled'
  from public.partner_settlement_lines l
  where l.settlement_id = p_settlement_id and l.earning_id = e.id;
end;
$$;

grant execute on function public.create_partner_settlement(uuid, date, date) to authenticated;
grant execute on function public.mark_settlement_paid(uuid, text, text) to authenticated;
grant execute on function public.sync_booking_payment_status(uuid) to authenticated;