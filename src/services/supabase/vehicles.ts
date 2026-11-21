import { getSupabaseClient } from '@/lib/supabase/client'
import { mapVehicle, vehicleToInsert } from '@/services/supabase/mappers'
import type { User, Vehicle, VehicleInput } from '@/types'

async function loadVehicle(id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select(
      `id, name, brand, model, year, category, seats, transmission, fuel,
      price_per_day_centavos, rate_first_day_centavos, rate_succeeding_day_centavos,
      rate_10_days_centavos, rate_15_plus_centavos,
      listing_status, listing_active, owner_id, partner_id,
      description, features, inclusions, plate_number, offered_rental_types, airconditioning,
      promo_video_path, created_at, vehicle_images ( storage_path, sort_order, is_primary )`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapVehicle(data as Parameters<typeof mapVehicle>[0])
}

async function syncImages(vehicleId: string, images: string[]) {
  const supabase = getSupabaseClient()
  await supabase.from('vehicle_images').delete().eq('vehicle_id', vehicleId)
  if (!images.length) return
  const rows = images.map((storage_path, index) => ({
    vehicle_id: vehicleId,
    storage_path,
    sort_order: index,
    is_primary: index === 0,
  }))
  const { error } = await supabase.from('vehicle_images').insert(rows)
  if (error) throw new Error(error.message)
}

async function getActor(actorId: string): Promise<User | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('profiles').select('id, role').eq('id', actorId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { id: data.id, role: data.role as User['role'] } as User
}

export async function createVehicle(input: VehicleInput, actorId: string): Promise<Vehicle> {
  const actor = await getActor(actorId)
  if (!actor || actor.role === 'customer') throw new Error('You cannot add a vehicle.')
  const supabase = getSupabaseClient()
  const row = vehicleToInsert(input, actorId, actor.role)
  const { data, error } = await supabase.from('vehicles').insert(row).select('id').single()
  if (error) throw new Error(error.message)
  await syncImages(data.id, input.images.length ? input.images : ['/vehicles/fortuner.jpg'])
  const vehicle = await loadVehicle(data.id)
  if (!vehicle) throw new Error('Vehicle was saved but could not be reloaded.')
  return vehicle
}

export async function updateVehicle(id: string, patch: Partial<VehicleInput>, actorId: string): Promise<Vehicle> {
  const actor = await getActor(actorId)
  if (!actor) throw new Error('You cannot edit vehicles.')
  const current = await loadVehicle(id)
  if (!current) throw new Error('Vehicle not found.')
  if (actor.role === 'customer') throw new Error('You cannot edit vehicles.')
  if (actor.role === 'partner' && current.partnerId !== actorId) throw new Error('You can only update your own listings.')

  const supabase = getSupabaseClient()
  const update: Record<string, unknown> = {}
  if (patch.name != null) update.name = patch.name
  if (patch.brand != null) update.brand = patch.brand
  if (patch.model != null) update.model = patch.model
  if (patch.year != null) update.year = patch.year
  if (patch.category != null) update.category = patch.category
  if (patch.seats != null) update.seats = patch.seats
  if (patch.transmission != null) update.transmission = patch.transmission
  if (patch.fuel != null) update.fuel = patch.fuel
  if (patch.pricePerDay != null) update.price_per_day_centavos = Math.round(patch.pricePerDay * 100)
  if (patch.rentalPackage != null) {
    const pkg = patch.rentalPackage
    update.price_per_day_centavos = Math.round(pkg.rateFirstDay * 100)
    update.rate_first_day_centavos = Math.round(pkg.rateFirstDay * 100)
    update.rate_succeeding_day_centavos = Math.round(pkg.rateSucceeding * 100)
    update.rate_10_days_centavos = Math.round(pkg.rate10Days * 100)
    update.rate_15_plus_centavos = Math.round(pkg.rate15Plus * 100)
  }
  if (patch.description != null) update.description = patch.description
  if (patch.features != null) update.features = patch.features
  if (patch.inclusions != null) update.inclusions = patch.inclusions
  if (patch.plateNumber != null) update.plate_number = patch.plateNumber
  if (patch.offeredRentalTypes != null) update.offered_rental_types = patch.offeredRentalTypes
  if (patch.airconditioning != null) update.airconditioning = patch.airconditioning
  if (patch.promoVideo !== undefined) update.promo_video_path = patch.promoVideo || null
  if (actor.role === 'admin') {
    if (patch.listingStatus != null) update.listing_status = patch.listingStatus
    if (patch.listingActive != null) update.listing_active = patch.listingActive
    if (patch.ownerId !== undefined) update.owner_id = patch.ownerId
    if (patch.partnerId !== undefined) update.partner_id = patch.partnerId
  }

  if (Object.keys(update).length) {
    const { error } = await supabase.from('vehicles').update(update).eq('id', id)
    if (error) throw new Error(error.message)
  }
  if (patch.images) await syncImages(id, patch.images)
  const vehicle = await loadVehicle(id)
  if (!vehicle) throw new Error('Vehicle not found.')
  return vehicle
}

/** Removes a vehicle from the catalog so it can be re-added fresh later (soft delete). */
export async function deleteVehicle(id: string, actorId: string): Promise<void> {
  const actor = await getActor(actorId)
  if (!actor || actor.role !== 'admin') throw new Error('Only an administrator can remove a vehicle.')
  const supabase = getSupabaseClient()
  await supabase.from('vehicle_images').delete().eq('vehicle_id', id)
  const { error } = await supabase
    .from('vehicles')
    .update({ listing_status: 'archived', listing_active: false, deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** @deprecated Use deleteVehicle */
export const archiveVehicle = deleteVehicle