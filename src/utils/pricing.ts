import type { BookingAddons, DriverPackageSettings, PriceBreakdown, RentalPackage, RentalType } from '@/types'
import { type DriverServiceZone, quoteDriverFee } from '@/utils/driverPackage'
import { packageDailyRate } from '@/utils/rentalPackage'

export const ADDON_RATES = {
  insurance: 300,
  childSeat: 200,
} as const

export function rentalDayCount(pickupDate: string, returnDate: string) {
  const [ys, ms, ds] = pickupDate.split('-').map(Number)
  const [ye, me, de] = returnDate.split('-').map(Number)
  const diff = Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000)
  return Math.max(diff, 1)
}

export function quotePackage(
  pkg: RentalPackage,
  pickupDate: string,
  returnDate: string,
  rentalType: RentalType,
  addons: BookingAddons = emptyAddons(),
  driverZone?: DriverServiceZone,
  driverPkg?: DriverPackageSettings,
  securityDepositAmount = 3000,
): PriceBreakdown {
  const days = rentalDayCount(pickupDate, returnDate)
  let base = 0
  for (let day = 1; day <= days; day++) {
    base += packageDailyRate(pkg, day, days)
  }
  const dailyRate = days > 0 ? base / days : pkg.rateFirstDay
  const driver =
    rentalType === 'with-driver' && driverZone && driverPkg ? quoteDriverFee(days, driverZone, driverPkg) : 0
  const insurance = addons.insurance ? ADDON_RATES.insurance * days : 0
  const childSeat = addons.childSeat ? ADDON_RATES.childSeat * days : 0
  return {
    days,
    dailyRate,
    base,
    insurance,
    driver,
    childSeat,
    securityDeposit: securityDepositAmount,
    total: base + insurance + driver + childSeat + securityDepositAmount,
  }
}

/** @deprecated Use quotePackage with resolveRentalPackage — kept for flat-rate fallbacks. */
export function quote(
  dailyRate: number,
  pickupDate: string,
  returnDate: string,
  rentalType: RentalType,
  addons: BookingAddons,
  securityDepositAmount = 3000,
): PriceBreakdown {
  const days = rentalDayCount(pickupDate, returnDate)
  const base = dailyRate * days
  const driver = 0
  const insurance = addons.insurance ? ADDON_RATES.insurance * days : 0
  const childSeat = addons.childSeat ? ADDON_RATES.childSeat * days : 0
  return {
    days,
    dailyRate,
    base,
    insurance,
    driver,
    childSeat,
    securityDeposit: securityDepositAmount,
    total: base + insurance + driver + childSeat + securityDepositAmount,
  }
}

export function emptyAddons(): BookingAddons {
  return { insurance: false, withDriver: false, childSeat: false }
}