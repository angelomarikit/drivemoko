-- Drive Moko — 021 production security hardening
-- Requires: 013–015 financial, 020 outbox
-- Non-destructive: tightens EXECUTE grants where safe.

-- Restrict payment balance sync to authenticated (already); document admin-only financial RPCs stay in 015.

revoke all on function public.sync_booking_payment_status(uuid) from public;
grant execute on function public.sync_booking_payment_status(uuid) to authenticated;

create or replace function public.admin_provision_profile(
  p_user_id uuid,
  p_role public.app_role,
  p_full_name text,
  p_email text,
  p_phone text default '',
  p_address text default '',
  p_title text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can provision accounts.';
  end if;
  if p_role = 'admin' and not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Admin provisioning restricted.';
  end if;
  insert into public.profiles (id, role, full_name, email, phone, address, title)
  values (p_user_id, p_role, p_full_name, lower(p_email), coalesce(p_phone, ''), coalesce(p_address, ''), coalesce(p_title, initcap(p_role::text)))
  on conflict (id) do update
  set role = excluded.role,
      full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone,
      address = excluded.address,
      title = excluded.title;
end;
$$;

grant execute on function public.admin_provision_profile(uuid, public.app_role, text, text, text, text, text) to authenticated;

comment on function public.admin_provision_profile is
  'Links an existing auth.users row to a privileged profile. Create auth user via Supabase Admin API / dashboard — never from the browser with service role.';

select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname in ('admin_provision_profile', 'sync_booking_payment_status')
order by 1;