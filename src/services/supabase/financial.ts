import { getSupabaseClient } from '@/lib/supabase/client'
import type { PartnerEarning, PartnerSettlement } from '@/types/financial'

function mapEarning(row: Record<string, unknown>): PartnerEarning {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    partnerId: row.partner_id as string,
    vehicleId: row.vehicle_id as string,
    grossCentavos: Number(row.gross_centavos),
    shareRateBps: Number(row.share_rate_bps),
    partnerShareCentavos: Number(row.partner_share_centavos),
    companyShareCentavos: Number(row.company_share_centavos),
    status: row.status as PartnerEarning['status'],
    recognizedAt: (row.recognized_at as string) ?? undefined,
    createdAt: row.created_at as string,
    bookingReference: (row as { bookings?: { reference?: string } }).bookings?.reference,
    vehicleName: (row as { vehicles?: { name?: string } }).vehicles?.name,
  }
}

function mapSettlement(row: Record<string, unknown>): PartnerSettlement {
  return {
    id: row.id as string,
    partnerId: row.partner_id as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    totalPartnerCentavos: Number(row.total_partner_centavos),
    status: row.status as PartnerSettlement['status'],
    payoutReference: (row.payout_reference as string) ?? '',
    paidAt: (row.paid_at as string) ?? undefined,
    notes: (row.notes as string) ?? '',
    createdAt: row.created_at as string,
    partnerName: (row as { profiles?: { full_name?: string } }).profiles?.full_name,
  }
}

export async function fetchPartnerEarnings(partnerId?: string): Promise<PartnerEarning[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('partner_earnings')
    .select('*, bookings ( reference ), vehicles ( name )')
    .order('created_at', { ascending: false })
  if (partnerId) query = query.eq('partner_id', partnerId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapEarning(row as Record<string, unknown>))
}

export async function fetchSettlements(partnerId?: string): Promise<PartnerSettlement[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('partner_settlements')
    .select('*, profiles:partner_id ( full_name )')
    .order('created_at', { ascending: false })
  if (partnerId) query = query.eq('partner_id', partnerId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapSettlement(row as Record<string, unknown>))
}

export async function createPartnerSettlement(partnerId: string, periodStart: string, periodEnd: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_partner_settlement', {
    p_partner_id: partnerId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function markSettlementPaid(settlementId: string, payoutReference: string, notes?: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('mark_settlement_paid', {
    p_settlement_id: settlementId,
    p_payout_reference: payoutReference,
    p_notes: notes ?? '',
  })
  if (error) throw new Error(error.message)
}

export async function recordRefund(bookingId: string, amountPesos: number, reason: string, actorId: string, paymentId?: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('refunds').insert({
    booking_id: bookingId,
    payment_id: paymentId ?? null,
    amount_centavos: Math.round(amountPesos * 100),
    reason,
    status: 'completed',
    created_by: actorId,
  })
  if (error) throw new Error(error.message)
  await supabase.rpc('sync_booking_payment_status', { p_booking_id: bookingId })
}

export function pesoFromCentavos(centavosValue: number) {
  return centavosValue / 100
}