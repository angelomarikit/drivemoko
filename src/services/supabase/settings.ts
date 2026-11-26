import { getSupabaseClient } from '@/lib/supabase/client'
import type { Settings } from '@/types'

export async function saveSupabaseSettings(patch: Partial<Settings>) {
  const supabase = getSupabaseClient()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.holdPendingBookings != null) row.hold_pending_bookings = patch.holdPendingBookings
  if (patch.companyCommissionRate != null) row.company_commission_rate = patch.companyCommissionRate
  if (patch.defaultPartnerShare != null) row.default_partner_share = patch.defaultPartnerShare
  if (patch.ownersCanBlockAvailability != null) row.owners_can_block_availability = patch.ownersCanBlockAvailability
  if (patch.smsSenderName != null) row.sms_sender_name = patch.smsSenderName
  if (patch.locations != null) row.locations = patch.locations
  const pkg = patch.defaultRentalPackage
  if (pkg) {
    row.default_rate_first_day_centavos = Math.round(pkg.rateFirstDay * 100)
    row.default_rate_succeeding_centavos = Math.round(pkg.rateSucceeding * 100)
    row.default_rate_10_days_centavos = Math.round(pkg.rate10Days * 100)
    row.default_rate_15_plus_centavos = Math.round(pkg.rate15Plus * 100)
  }
  const pkgInside = patch.defaultRentalPackageInside
  if (pkgInside) {
    row.default_inside_rate_first_day_centavos = Math.round(pkgInside.rateFirstDay * 100)
    row.default_inside_rate_succeeding_centavos = Math.round(pkgInside.rateSucceeding * 100)
    row.default_inside_rate_10_days_centavos = Math.round(pkgInside.rate10Days * 100)
    row.default_inside_rate_15_plus_centavos = Math.round(pkgInside.rate15Plus * 100)
  }
  const driver = patch.defaultDriverPackage
  if (driver) {
    row.driver_inside_per_day_centavos = Math.round(driver.insidePerDay * 100)
    row.driver_outside_first_day_centavos = Math.round(driver.outsideFirstDay * 100)
    row.driver_outside_succeeding_centavos = Math.round(driver.outsideSucceeding * 100)
  }
  if (patch.securityDepositAmount != null) {
    row.security_deposit_centavos = Math.round(patch.securityDepositAmount * 100)
  }
  const { error } = await supabase.from('system_settings').update(row).eq('id', 1)
  if (error) throw new Error(error.message)
}