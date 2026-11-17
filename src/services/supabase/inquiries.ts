import { getSupabaseClient } from '@/lib/supabase/client'
import { fetchSupabaseSnapshot } from '@/services/supabase/snapshot'
import type { InquiryInput } from '@/types'
import { isUuid, resolveVehicleForBooking } from '@/utils/vehicleParam'

export async function createInquiry(input: InquiryInput) {
  let vehicleId: string | null = null
  if (input.vehicleId) {
    const snap = await fetchSupabaseSnapshot()
    const vehicle = resolveVehicleForBooking(snap.vehicles, input.vehicleId)
    if (isUuid(vehicle.id)) vehicleId = vehicle.id
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase.from('support_inquiries').insert({
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
    vehicle_id: vehicleId,
  })
  if (error) throw new Error(error.message)
}