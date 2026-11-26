import type { RentalPackage, Settings, User, Vehicle } from '@/types'
import type { RentalServiceZone } from '@/utils/driverPackage'

/** Default within Nueva Vizcaya. */
export const DEFAULT_RENTAL_PACKAGE_INSIDE: RentalPackage = {
  rateFirstDay: 3499,
  rateSucceeding: 2499,
  rate10Days: 2199,
  rate15Plus: 1999,
}

/** Default outside province — matches legacy site default until admin sets per vehicle. */
export const DEFAULT_RENTAL_PACKAGE_OUTSIDE: RentalPackage = {
  rateFirstDay: 4999,
  rateSucceeding: 3499,
  rate10Days: 3199,
  rate15Plus: 2999,
}

/** @deprecated use DEFAULT_RENTAL_PACKAGE_INSIDE */
export const DEFAULT_RENTAL_PACKAGE = DEFAULT_RENTAL_PACKAGE_INSIDE

export interface RentalPackagesByZone {
  inside: RentalPackage
  outside: RentalPackage
}

export function resolveRentalPackage(
  vehicle: Vehicle,
  settings: Settings,
  zone: RentalServiceZone = 'inside',
): RentalPackage {
  if (zone === 'outside') {
    if (vehicle.rentalPackage) return vehicle.rentalPackage
    return settings.defaultRentalPackage ?? DEFAULT_RENTAL_PACKAGE_OUTSIDE
  }
  if (vehicle.rentalPackageInside) return vehicle.rentalPackageInside
  return settings.defaultRentalPackageInside ?? DEFAULT_RENTAL_PACKAGE_INSIDE
}

export function resolveRentalPackages(vehicle: Vehicle, settings: Settings): RentalPackagesByZone {
  return {
    inside: resolveRentalPackage(vehicle, settings, 'inside'),
    outside: resolveRentalPackage(vehicle, settings, 'outside'),
  }
}

export function rentalServiceZoneLabel(zone: RentalServiceZone) {
  return zone === 'outside' ? 'Outside Nueva Vizcaya' : 'Within Nueva Vizcaya'
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

/**
 * Min/max for cards and filters: this vehicle's outside tiers plus inside tiers only when
 * the vehicle has an inside override (not the site-wide inside default).
 */
export function vehicleListingPriceBounds(vehicle: Vehicle, settings: Settings): { min: number; max: number } {
  const packages: RentalPackage[] = [resolveRentalPackage(vehicle, settings, 'outside')]
  if (vehicle.rentalPackageInside) packages.push(vehicle.rentalPackageInside)
  const rates = packages.flatMap((pkg) => [
    pkg.rateFirstDay,
    pkg.rateSucceeding,
    pkg.rate10Days,
    pkg.rate15Plus,
  ])
  return { min: Math.min(...rates), max: Math.max(...rates) }
}

export function formatVehicleListingPriceRange(
  vehicle: Vehicle,
  settings: Settings,
  format: (amount: number) => string,
): string {
  const { min, max } = vehicleListingPriceBounds(vehicle, settings)
  if (min === max) return format(min)
  return `${format(min)} - ${format(max)}`
}

/** @deprecated Use formatVehicleListingPriceRange — site inside default skewed listing mins. */
export function formatRentalPriceRangeCombined(
  packages: RentalPackagesByZone,
  format: (amount: number) => string,
): string {
  const inside = rentalPackageRateBounds(packages.inside)
  const outside = rentalPackageRateBounds(packages.outside)
  const min = Math.min(inside.min, outside.min)
  const max = Math.max(inside.max, outside.max)
  if (min === max) return format(min)
  return `${format(min)} - ${format(max)}`
}