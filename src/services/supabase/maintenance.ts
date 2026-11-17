import { getSupabaseClient } from '@/lib/supabase/client'
import { fetchSupabaseSnapshot } from '@/services/supabase/snapshot'
import type { MaintenanceInput } from '@/types'
import { isUuid, resolveVehicleForBooking } from '@/utils/vehicleParam'

export async function addMaintenance(input: MaintenanceInput) {
  const snap = await fetchSupabaseSnapshot()
  const vehicle = resolveVehicleForBooking(snap.vehicles, input.vehicleId)
  if (!isUuid(vehicle.id)) throw new Error('Could not resolve vehicle for this block.')

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('vehicle_availability_blocks').insert({
    vehicle_id: vehicle.id,
    start_date: input.startDate,
    end_date: input.endDate,
    reason: input.reason,
    created_by: input.actorId,
  })
  if (error) throw new Error(error.message)
}

export async function removeMaintenance(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('vehicle_availability_blocks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}