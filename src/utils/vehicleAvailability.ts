import type { Booking, BookingStatus, DemoData, MaintenanceWindow } from '@/types'
import { addDays, eachDate, manilaYmd } from '@/utils/dates'
import { blocksCalendar } from '@/utils/bookingRules'

export type DayAvailability = 'past' | 'available' | 'booked' | 'pending' | 'maintenance'

export interface VehicleBlock {
  id: string
  kind: 'booking' | 'maintenance'
  label: string
  start: string
  end: string
  status?: BookingStatus
}

function maintenanceDays(window: MaintenanceWindow) {
  return eachDate(window.startDate, addDays(window.endDate, 1))
}

function bookingDays(booking: Booking) {
  return eachDate(booking.pickupDate, booking.returnDate)
}

export function vehicleDayMap(
  vehicleId: string,
  data: Pick<DemoData, 'bookings' | 'maintenance' | 'settings'>,
): Map<string, DayAvailability> {
  const today = manilaYmd()
  const map = new Map<string, DayAvailability>()
  const holdPending = data.settings.holdPendingBookings

  for (const window of data.maintenance.filter((item) => item.vehicleId === vehicleId)) {
    for (const ymd of maintenanceDays(window)) {
      map.set(ymd, 'maintenance')
    }
  }

  for (const booking of data.bookings.filter((item) => item.vehicleId === vehicleId)) {
    if (!blocksCalendar(booking.status, holdPending)) continue
    const tone: DayAvailability = booking.status === 'pending' ? 'pending' : 'booked'
    for (const ymd of bookingDays(booking)) {
      if (map.get(ymd) === 'maintenance') continue
      map.set(ymd, tone)
    }
  }

  for (const [ymd, status] of map) {
    if (ymd < today && status !== 'maintenance') map.delete(ymd)
  }

  return map
}

export function dayAvailability(ymd: string, map: Map<string, DayAvailability>): DayAvailability {
  if (ymd < manilaYmd()) return 'past'
  return map.get(ymd) ?? 'available'
}

export function vehicleBlocks(vehicleId: string, data: Pick<DemoData, 'bookings' | 'maintenance'>): VehicleBlock[] {
  const today = manilaYmd()
  const bookings = data.bookings
    .filter((item) => item.vehicleId === vehicleId && !['cancelled', 'rejected', 'completed'].includes(item.status))
    .filter((item) => item.returnDate > today)
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))
    .map<VehicleBlock>((item) => ({
      id: item.id,
      kind: 'booking',
      label: item.reference,
      start: item.pickupDate,
      end: addDays(item.returnDate, -1),
      status: item.status,
    }))

  const maintenance = data.maintenance
    .filter((item) => item.vehicleId === vehicleId && item.endDate >= today)
    .map<VehicleBlock>((item) => ({
      id: item.id,
      kind: 'maintenance',
      label: item.reason,
      start: item.startDate,
      end: item.endDate,
    }))

  return [...bookings, ...maintenance].sort((a, b) => a.start.localeCompare(b.start))
}
