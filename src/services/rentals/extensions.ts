import { getSupabaseClient } from '@/lib/supabase/client'

export async function requestExtension(input: {
  bookingId: string
  requestedReturnDate: string
  requestedReturnTime: string
  reason: string
  additionalChargePesos: number
  requestedBy: string
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('booking_extensions')
    .insert({
      booking_id: input.bookingId,
      requested_return_date: input.requestedReturnDate,
      requested_return_time: input.requestedReturnTime,
      reason: input.reason,
      additional_charge_centavos: Math.round(input.additionalChargePesos * 100),
      requested_by: input.requestedBy,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function approveExtension(extensionId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('approve_booking_extension', { p_extension_id: extensionId })
  if (error) throw new Error(error.message)
}

export async function listExtensions(bookingId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('booking_extensions')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function flagLateReturn(bookingId: string, lateFeePesos: number) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('bookings')
    .update({
      late_return_flag: true,
      late_fee_centavos: Math.round(lateFeePesos * 100),
    })
    .eq('id', bookingId)
  if (error) throw new Error(error.message)
}