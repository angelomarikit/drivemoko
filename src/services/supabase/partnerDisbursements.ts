import { getSupabaseClient } from '@/lib/supabase/client'
import type { PartnerDisbursement, RecordPartnerDisbursementInput } from '@/types'

type Row = {
  id: string
  partner_id: string
  amount_centavos: number
  payout_reference: string
  method: PartnerDisbursement['method']
  paid_at: string
  paid_by: string | null
  notes: string
}

function mapRow(row: Row): PartnerDisbursement {
  return {
    id: row.id,
    partnerId: row.partner_id,
    amount: row.amount_centavos / 100,
    payoutReference: row.payout_reference,
    method: row.method,
    paidAt: row.paid_at,
    notes: row.notes || undefined,
    createdBy: row.paid_by ?? undefined,
  }
}

export async function listPartnerDisbursements(partnerId?: string): Promise<PartnerDisbursement[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('partner_disbursements')
    .select('id, partner_id, amount_centavos, payout_reference, method, paid_at, paid_by, notes')
    .order('paid_at', { ascending: false })
  if (partnerId) query = query.eq('partner_id', partnerId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Row))
}

export async function recordPartnerDisbursement(input: RecordPartnerDisbursementInput, actorId: string) {
  const supabase = getSupabaseClient()
  const { data: actor, error: actorError } = await supabase.from('profiles').select('role').eq('id', actorId).maybeSingle()
  if (actorError) throw new Error(actorError.message)
  if (!actor || actor.role !== 'admin') throw new Error('Only an administrator can record disbursements.')

  const { data, error } = await supabase
    .from('partner_disbursements')
    .insert({
      partner_id: input.partnerId,
      amount_centavos: Math.round(input.amount * 100),
      payout_reference: input.payoutReference.trim(),
      method: input.method ?? 'gcash',
      paid_by: actorId,
      notes: input.notes?.trim() ?? '',
    })
    .select('id, partner_id, amount_centavos, payout_reference, method, paid_at, paid_by, notes')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}