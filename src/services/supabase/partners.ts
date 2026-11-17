import { getSupabaseClient } from '@/lib/supabase/client'
import { mapApplication } from '@/services/supabase/mappers'
import type { ApplicationInput, PartnerApplication } from '@/types'

export async function listApplications(): Promise<PartnerApplication[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('partner_applications').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapApplication(row as Parameters<typeof mapApplication>[0]))
}

export async function submitApplication(input: ApplicationInput) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('partner_applications').insert({
    full_name: input.fullName,
    phone: input.phone,
    email: input.email.trim().toLowerCase(),
    address: input.address,
    vehicle_details: input.vehicleDetails,
    ownership_type: input.ownershipType,
    vehicle_count: input.vehicleCount,
    notes: input.notes,
  })
  if (error) throw new Error(error.message)
}

export async function reviewApplication(
  id: string,
  decision: 'approved' | 'rejected' | 'needs_info',
  actorId: string,
  shareRate?: number,
  reviewNote?: string,
) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('partner_applications')
    .update({
      status: decision,
      share_rate_bps: shareRate != null ? Math.round(shareRate * 100) : null,
      review_note: reviewNote ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}