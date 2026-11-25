import type { RentalPackage, Settings, User, Vehicle } from '@/types'

export const DEFAULT_RENTAL_PACKAGE: RentalPackage = {
  rateFirstDay: 3499,
  rateSucceeding: 2499,
  rate10Days: 2199,
  rate15Plus: 1999,
}

export function resolveRentalPackage(vehicle: Vehicle, settings: Settings): RentalPackage {
  if (vehicle.rentalPackage) return vehicle.rentalPackage
  return settings.defaultRentalPackage ?? DEFAULT_RENTAL_PACKAGE
}

/** Rates partners see on their dashboard — admin fleet package, else first fleet vehicle, else site default. */
export function resolvePartnerDashboardPackage(partner: User, vehicles: Vehicle[], settings: Settings): RentalPackage {
  if (partner.partnerProfile?.rentalPackage) return partner.partnerProfile.rentalPackage
  const fleet = vehicles.filter((vehicle) => vehicle.partnerId === partner.id)
  if (fleet.length) {
    const withRates = fleet.find((vehicle) => vehicle.rentalPackage) ?? fleet[0]
    return resolveRentalPackage(withRates, settings)
  }
  return settings.defaultRentalPackage ?? DEFAULT_RENTAL_PACKAGE
}

/** Per-day rate for day index (1-based) given total rental length. */
export function packageDailyRate(pkg: RentalPackage, dayIndex: number, totalDays: number): number {
  if (totalDays >= 15 && dayIndex >= 15) return pkg.rate15Plus
  if (totalDays >= 10 && dayIndex >= 10) return pkg.rate10Days
  if (dayIndex === 1) return pkg.rateFirstDay
  return pkg.rateSucceeding
}

export function packageFromFlatDaily(rate: number): RentalPackage {
  return {
    rateFirstDay: rate,
    rateSucceeding: rate,
    rate10Days: rate,
    rate15Plus: rate,
  }
}

export function rentalPackageRateBounds(pkg: RentalPackage): { min: number; max: number } {
  const rates = [pkg.rateFirstDay, pkg.rateSucceeding, pkg.rate10Days, pkg.rate15Plus]
  return { min: Math.min(...rates), max: Math.max(...rates) }
}

/** Smallest to biggest tier rate, e.g. ₱2,999 - ₱4,999 */
export function formatRentalPriceRange(pkg: RentalPackage, format: (amount: number) => string): string {
  const { min, max } = rentalPackageRateBounds(pkg)
  if (min === max) return format(min)
  return `${format(min)} - ${format(max)}`
}