import { getSupabaseClient } from '@/lib/supabase/client'
import { fetchSupabaseSnapshot } from '@/services/supabase/snapshot'
import { isUuid, resolveVehicleForBooking } from '@/utils/vehicleParam'

export async function toggleFavorite(userId: string, vehicleId: string) {
  const snap = await fetchSupabaseSnapshot()
  const vehicle = resolveVehicleForBooking(snap.vehicles, vehicleId)
  const fleetId = vehicle.id
  if (!isUuid(fleetId)) {
    throw new Error('Could not save favorite for this vehicle. Open it from Available Cars and try again.')
  }

  const supabase = getSupabaseClient()
  const { data: existing } = await supabase
    .from('customer_favorites')
    .select('vehicle_id')
    .eq('user_id', userId)
    .eq('vehicle_id', fleetId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('customer_favorites').delete().eq('user_id', userId).eq('vehicle_id', fleetId)
    if (error) throw new Error(error.message)
    return false
  }

  const { error } = await supabase.from('customer_favorites').insert({ user_id: userId, vehicle_id: fleetId })
  if (error) throw new Error(error.message)
  return true
}