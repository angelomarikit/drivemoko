-- Drive Moko — 034 admin soft-delete vehicle (bypasses client-side RLS edge cases)
-- Requires: 011 RLS, is_admin()

create or replace function public.admin_remove_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;
  if not public.is_admin() then
    raise exception 'Only administrators can remove a vehicle.';
  end if;

  delete from public.vehicle_images where vehicle_id = p_vehicle_id;

  update public.vehicles
  set
    listing_status = 'archived',
    listing_active = false,
    deleted_at = coalesce(deleted_at, now())
  where id = p_vehicle_id;

  if not found then
    raise exception 'Vehicle not found.';
  end if;
end;
$$;

revoke all on function public.admin_remove_vehicle(uuid) from public;
grant execute on function public.admin_remove_vehicle(uuid) to authenticated;

comment on function public.admin_remove_vehicle is
  'Admin-only soft delete: clears gallery rows and hides vehicle from catalog (deleted_at).';

select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname = 'admin_remove_vehicle';