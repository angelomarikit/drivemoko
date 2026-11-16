import type { BookingAddons, PriceBreakdown, RentalType } from '@/types'

export const ADDON_RATES = {
  insurance: 300,
  withDriver: 1500,
  childSeat: 200,
} as const

export function rentalDayCount(pickupDate: string, returnDate: string) {
  const [ys, ms, ds] = pickupDate.split('-').map(Number)
  const [ye, me, de] = returnDate.split('-').map(Number)
  const diff = Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000)
  return Math.max(diff, 1)
}

export function quote(
  dailyRate: number,
  pickupDate: string,
  returnDate: string,
  rentalType: RentalType,
  addons: BookingAddons,
): PriceBreakdown {
  const days = rentalDayCount(pickupDate, returnDate)
  const base = dailyRate * days
  const driver = rentalType === 'with-driver' || addons.withDriver ? ADDON_RATES.withDriver * days : 0
  const insurance = addons.insurance ? ADDON_RATES.insurance * days : 0
  const childSeat = addons.childSeat ? ADDON_RATES.childSeat * days : 0
  return {
    days,
    dailyRate,
    base,
    insurance,
    driver,
    childSeat,
    total: base + insurance + driver + childSeat,
  }
}

export function emptyAddons(): BookingAddons {
  return { insurance: false, withDriver: false, childSeat: false }
}
