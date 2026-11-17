import { getSupabaseClient } from '@/lib/supabase/client'
import { inspectionPhotoPath } from '@/services/storage/paths'
import { uploadImageAsset } from '@/services/storage/upload'

export type InspectionPhase = 'checkout' | 'return'

export interface InspectionInput {
  bookingId: string
  phase: InspectionPhase
  odometerKm?: number
  fuelLevel: string
  conditionNotes: string
  damageNotes: string
  extraChargesPesos?: number
  staffId: string
  customerAck: boolean
  photos?: File[]
}

export async function upsertInspection(input: InspectionInput) {
  const supabase = getSupabaseClient()
  const { data: row, error } = await supabase
    .from('rental_inspections')
    .upsert(
      {
        booking_id: input.bookingId,
        phase: input.phase,
        odometer_km: input.odometerKm ?? null,
        fuel_level: input.fuelLevel,
        condition_notes: input.conditionNotes,
        damage_notes: input.damageNotes,
        extra_charges_centavos: Math.round((input.extraChargesPesos ?? 0) * 100),
        staff_id: input.staffId,
        customer_ack: input.customerAck,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: 'booking_id,phase' },
    )
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  if (input.photos?.length) {
    for (const [index, file] of input.photos.entries()) {
      const path = inspectionPhotoPath(input.bookingId, input.phase, `${crypto.randomUUID()}.jpg`)
      await uploadImageAsset(path, file)
      await supabase.from('rental_inspection_photos').insert({
        inspection_id: row.id,
        storage_path: path,
        sort_order: index,
      })
    }
  }
  return row.id as string
}

export async function listInspections(bookingId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('rental_inspections')
    .select('*, rental_inspection_photos ( storage_path, sort_order )')
    .eq('booking_id', bookingId)
    .order('phase')
  if (error) throw new Error(error.message)
  return data ?? []
}