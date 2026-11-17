-- Drive Moko — 011 RLS (Phase 3 core: profiles, vehicles, bookings, blocks, settings, notifications)
-- Run after 008, 009 and 002d (profiles_select_own).

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select to authenticated
  using (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_role());

-- vehicles
alter table public.vehicles enable row level security;

drop policy if exists "vehicles_select_public_catalog" on public.vehicles;
create policy "vehicles_select_public_catalog"
  on public.vehicles for select
  using (
    deleted_at is null
    and (
      (listing_status = 'approved' and listing_active = true)
      or auth.uid() = owner_id
      or auth.uid() = partner_id
      or public.is_admin()
    )
  );

drop policy if exists "vehicles_insert_staff" on public.vehicles;
create policy "vehicles_insert_staff"
  on public.vehicles for insert to authenticated
  with check (
    public.is_admin()
    or (public.current_role() = 'owner' and owner_id = auth.uid())
    or (public.current_role() = 'partner' and partner_id = auth.uid())
  );

drop policy if exists "vehicles_update_staff" on public.vehicles;
create policy "vehicles_update_staff"
  on public.vehicles for update to authenticated
  using (
    public.is_admin()
    or (public.current_role() = 'owner' and owner_id = auth.uid())
    or (public.current_role() = 'partner' and partner_id = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.current_role() = 'owner' and owner_id = auth.uid())
    or (public.current_role() = 'partner' and partner_id = auth.uid())
  );

-- vehicle images
alter table public.vehicle_images enable row level security;

drop policy if exists "vehicle_images_select" on public.vehicle_images;
create policy "vehicle_images_select"
  on public.vehicle_images for select
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and v.deleted_at is null
        and (
          (v.listing_status = 'approved' and v.listing_active = true)
          or auth.uid() = v.owner_id
          or auth.uid() = v.partner_id
          or public.is_admin()
        )
    )
  );

drop policy if exists "vehicle_images_mutate_staff" on public.vehicle_images;
create policy "vehicle_images_mutate_staff"
  on public.vehicle_images for all to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and (
          public.is_admin()
          or (public.current_role() = 'owner' and v.owner_id = auth.uid())
          or (public.current_role() = 'partner' and v.partner_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and (
          public.is_admin()
          or (public.current_role() = 'owner' and v.owner_id = auth.uid())
          or (public.current_role() = 'partner' and v.partner_id = auth.uid())
        )
    )
  );

-- bookings
alter table public.bookings enable row level security;

drop policy if exists "bookings_select_scoped" on public.bookings;
create policy "bookings_select_scoped"
  on public.bookings for select to authenticated
  using (
    public.is_admin()
    or customer_id = auth.uid()
    or exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
    )
  );

drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin"
  on public.bookings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- booking status history (read with booking access)
alter table public.booking_status_history enable row level security;

drop policy if exists "booking_history_select" on public.booking_status_history;
create policy "booking_history_select"
  on public.booking_status_history for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          public.is_admin()
          or b.customer_id = auth.uid()
          or exists (
            select 1 from public.vehicles v
            where v.id = b.vehicle_id and (v.owner_id = auth.uid() or v.partner_id = auth.uid())
          )
        )
    )
  );

-- availability blocks
alter table public.vehicle_availability_blocks enable row level security;

drop policy if exists "blocks_select" on public.vehicle_availability_blocks;
create policy "blocks_select"
  on public.vehicle_availability_blocks for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and (
          (v.listing_status = 'approved' and v.listing_active = true)
          or v.owner_id = auth.uid()
          or v.partner_id = auth.uid()
        )
    )
  );

drop policy if exists "blocks_mutate" on public.vehicle_availability_blocks;
create policy "blocks_mutate"
  on public.vehicle_availability_blocks for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and (
          (public.current_role() = 'owner' and v.owner_id = auth.uid())
          or (public.current_role() = 'partner' and v.partner_id = auth.uid())
        )
    )
  )
  with check (
    public.is_admin()
    or created_by = auth.uid()
  );

-- settings (read all staff, write admin)
alter table public.system_settings enable row level security;

drop policy if exists "settings_select_auth" on public.system_settings;
create policy "settings_select_auth"
  on public.system_settings for select to authenticated
  using (true);

drop policy if exists "settings_update_admin" on public.system_settings;
create policy "settings_update_admin"
  on public.system_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- notifications
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

select tablename, policyname from pg_policies
where schemaname = 'public'
order by tablename, policyname;