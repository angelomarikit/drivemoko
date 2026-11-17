import type { Booking, RentalPackage, Settings, User, Vehicle } from '@/types'
import { packageDailyRate } from '@/utils/rentalPackage'

/** Default fixed partner earnings per rental day (admin can override per partner). */
export const DEFAULT_PARTNER_FIXED_SHARE: RentalPackage = {
  rateFirstDay: 2000,
  rateSucceeding: 1500,
  rate10Days: 1300,
  rate15Plus: 1200,
}

export function resolvePartnerFixedShare(partner: User | undefined, settings: Settings): RentalPackage {
  return partner?.partnerProfile?.fixedShare ?? settings.defaultPartnerFixedShare ?? DEFAULT_PARTNER_FIXED_SHARE
}

/** Partner payout for a booking using fixed per-day tiers (not % of gross). */
export function fixedShareTotalForBooking(
  booking: Booking,
  partner: User | undefined,
  settings: Settings,
): number {
  const pkg = resolvePartnerFixedShare(partner, settings)
  const days = Math.max(1, booking.pricing.days)
  let total = 0
  for (let day = 1; day <= days; day++) {
    total += packageDailyRate(pkg, day, days)
  }
  return Math.round(total)
}

export function fixedShareForVehiclePartner(
  vehicle: Vehicle | undefined,
  users: User[],
  settings: Settings,
  viewerId: string,
) {
  if (!vehicle?.partnerId) return resolvePartnerFixedShare(undefined, settings)
  const partner = users.find((user) => user.id === vehicle.partnerId)
  if (vehicle.partnerId !== viewerId) return resolvePartnerFixedShare(partner, settings)
  return resolvePartnerFixedShare(partner, settings)
}