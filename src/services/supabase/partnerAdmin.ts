import { getSupabaseClient } from '@/lib/supabase/client'
import { PARTNER_COMMISSION_PERCENT } from '@/utils/partnerShare'
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
  if (!data || data.role !== 'admin') throw new Error('Only an administrator can edit partner profiles.')
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

  const partnerPatch: Record<string, unknown> = {
    share_rate_bps: PARTNER_COMMISSION_PERCENT * 100,
  }
  if (input.rentalPackage) {
    Object.assign(partnerPatch, packageToCentavos(input.rentalPackage))
  }

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