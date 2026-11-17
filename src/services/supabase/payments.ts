import { getSupabaseClient } from '@/lib/supabase/client'
import { mapPayment } from '@/services/supabase/mappers'
import { paymentProofPath } from '@/services/storage/paths'
import { uploadDocumentAsset } from '@/services/storage/upload'
import type { Payment, PaymentInput } from '@/types'

export async function listPayments(): Promise<Payment[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapPayment(row))
}

export async function recordPayment(input: PaymentInput): Promise<Payment> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payments')
    .insert({
      booking_id: input.bookingId,
      amount_centavos: Math.round(input.amount * 100),
      method: input.method,
      status: input.markVerified ? 'verified' : 'pending',
      reference: input.reference,
      note: input.note,
      recorded_by: input.actorId,
      verified_by: input.markVerified ? input.actorId : null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  if (input.proofFile) {
    const proofPath = paymentProofPath(
      input.bookingId,
      data.id,
      `${crypto.randomUUID()}.${input.proofFile.type.includes('pdf') ? 'pdf' : 'jpg'}`,
    )
    await uploadDocumentAsset(proofPath, input.proofFile)
    await supabase
      .from('payments')
      .update({ proof_storage_path: proofPath, proof_uploaded_at: new Date().toISOString() })
      .eq('id', data.id)
  }

  await supabase.rpc('sync_booking_payment_status', { p_booking_id: input.bookingId })

  return mapPayment(data)
}

export async function verifyPayment(id: string, actorId: string) {
  const supabase = getSupabaseClient()
  const { data: payment, error: loadError } = await supabase.from('payments').select('booking_id').eq('id', id).maybeSingle()
  if (loadError) throw new Error(loadError.message)
  if (!payment) throw new Error('Payment not found.')

  const { error } = await supabase
    .from('payments')
    .update({ status: 'verified', verified_by: actorId })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await supabase.rpc('sync_booking_payment_status', { p_booking_id: payment.booking_id })
}

export async function rejectPayment(id: string, actorId: string, reason: string) {
  const supabase = getSupabaseClient()
  const { data: payment, error: loadError } = await supabase.from('payments').select('booking_id').eq('id', id).maybeSingle()
  if (loadError) throw new Error(loadError.message)
  if (!payment) throw new Error('Payment not found.')

  const { error } = await supabase
    .from('payments')
    .update({ status: 'rejected', rejected_reason: reason, verified_by: actorId })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await supabase.rpc('sync_booking_payment_status', { p_booking_id: payment.booking_id })
}