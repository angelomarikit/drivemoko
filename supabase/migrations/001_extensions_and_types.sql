-- Drive Moko — 001 extensions and types
-- Run first in Supabase SQL Editor.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Roles align with src/types Role
create type public.app_role as enum (
  'admin',
  'owner',
  'partner',
  'customer'
);

create type public.account_status as enum ('active', 'suspended');

create type public.vehicle_category as enum (
  'SUV', 'Sedan', 'MPV', 'Van', 'Pickup', 'Others'
);

create type public.transmission as enum ('Automatic', 'Manual');
create type public.fuel_type as enum ('Diesel', 'Gasoline');
create type public.rental_type as enum ('self-drive', 'with-driver');
create type public.listing_status as enum (
  'approved', 'pending', 'rejected', 'archived'
);

create type public.booking_status as enum (
  'pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'rejected'
);

create type public.payment_status as enum (
  'unpaid', 'pending', 'partial', 'paid', 'rejected'
);

create type public.payment_method as enum ('cash', 'gcash', 'maya', 'bank');

create type public.payment_record_status as enum (
  'pending', 'verified', 'rejected'
);

create type public.application_status as enum (
  'pending', 'approved', 'rejected', 'needs_info'
);

create type public.ownership_type as enum ('owned', 'financed', 'fleet');

-- Verification
select typname
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and typname in (
    'app_role', 'booking_status', 'listing_status', 'payment_record_status'
  )
order by typname;