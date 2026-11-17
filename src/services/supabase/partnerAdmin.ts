import { getSupabaseClient } from '@/lib/supabase/client'
import type { PartnerAdminInput, RentalPackage } from '@/types'

function packageToCentavos(pkg: RentalPackage) {
  return {
    rate_first_day_centavos: Math.round(pkg.rateFirstDay * 100),
    rate_succeeding_day_centavos: Math.round(pkg.rateSucceeding * 100),
    rate_10_days_centavos: Math.round(pkg.rate10Days * 100),
    rate_15_plus_centavos: Math.round(pkg.rate15Plus * 100),
  }
}

async function assertAdmin(actorId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('profiles').select('role').eq('id', actorId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data || data.role !== 'admin') throw new Error('Only an administrator can edit partner rates.')
}

export async function updatePartnerAdminProfile(partnerId: string, input: PartnerAdminInput, actorId: string) {
  await assertAdmin(actorId)
  const supabase = getSupabaseClient()

  const profilePatch: Record<string, unknown> = {}
  if (input.name != null && input.name.trim()) profilePatch.full_name = input.name.trim()
  if (input.notes !== undefined) profilePatch.notes = input.notes

  if (Object.keys(profilePatch).length) {
    const { error } = await supabase.from('profiles').update(profilePatch).eq('id', partnerId)
    if (error) throw new Error(error.message)
  }

  const partnerPatch: Record<string, unknown> = {}
  if (input.rentalPackage) {
    Object.assign(partnerPatch, packageToCentavos(input.rentalPackage))
  }
  const fixed = packageToCentavos(input.fixedShare)
  partnerPatch.share_first_day_centavos = fixed.rate_first_day_centavos
  partnerPatch.share_succeeding_day_centavos = fixed.rate_succeeding_day_centavos
  partnerPatch.share_10_days_centavos = fixed.rate_10_days_centavos
  partnerPatch.share_15_plus_centavos = fixed.rate_15_plus_centavos

  const { error: partnerError } = await supabase.from('partner_profiles').update(partnerPatch).eq('profile_id', partnerId)
  if (partnerError) throw new Error(partnerError.message)

  if (input.rentalPackage) {
    const pkg = packageToCentavos(input.rentalPackage)
    const vehiclePatch = {
      ...pkg,
      price_per_day_centavos: pkg.rate_first_day_centavos,
    }
    const { error: fleetError } = await supabase.from('vehicles').update(vehiclePatch).eq('partner_id', partnerId)
    if (fleetError) throw new Error(fleetError.message)
  }
}