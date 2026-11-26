import type { DriverPackageSettings } from '@/types'

/** With-driver service rates (reference + booking quotes). */
export const DEFAULT_DRIVER_PACKAGE: DriverPackageSettings = {
  insidePerDay: 1000,
  outsideFirstDay: 3000,
  outsideSucceeding: 1000,
}

export type DriverServiceZone = 'inside' | 'outside'

/** Self-drive / base rental tier selection (same inside vs outside province). */
export type RentalServiceZone = DriverServiceZone

export const OUTSIDE_NUEVA_VIZCAYA_LOCATION = 'Outside Nueva Vizcaya'

export function isOutsideNuevaVizcaya(pickupLocation: string) {
  return pickupLocation === OUTSIDE_NUEVA_VIZCAYA_LOCATION
}

export function driverZoneToPricingLocation(zone: DriverServiceZone) {
  return zone === 'outside' ? OUTSIDE_NUEVA_VIZCAYA_LOCATION : 'Inside Nueva Vizcaya'
}

export function driverPackageLabel(zone: DriverServiceZone) {
  return zone === 'outside' ? 'Outside Nueva Vizcaya' : 'Inside Nueva Vizcaya'
}

export function quoteDriverFee(days: number, zone: DriverServiceZone, pkg: DriverPackageSettings = DEFAULT_DRIVER_PACKAGE) {
  if (days < 1) return 0
  if (zone === 'outside') {
    let total = 0
    for (let day = 1; day <= days; day++) {
      total += day === 1 ? pkg.outsideFirstDay : pkg.outsideSucceeding
    }
    return total
  }
  return pkg.insidePerDay * days
}