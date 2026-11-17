import type { Booking, BookingStatus, DemoData, MaintenanceWindow, RentalType, Vehicle } from '@/types'
import { manilaTime, manilaYmd, rangesOverlap } from '@/utils/dates'
import { isUuid } from '@/utils/vehicleParam'

export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['ongoing', 'cancelled'],
  ongoing: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
}

export function canTransition(from: BookingStatus, to: BookingStatus) {
  return TRANSITIONS[from].includes(to)
}

export function blocksCalendar(status: BookingStatus, holdPending: boolean) {
  if (status === 'cancelled' || status === 'rejected' || status === 'completed') return false
  if (status === 'pending') return holdPending
  return true
}

export function maintenanceOverlaps(pickup: string, ret: string, window: MaintenanceWindow) {
  const endExclusive = nextDay(window.endDate)
  return rangesOverlap(pickup, ret, window.startDate, endExclusive)
}

function nextDay(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function conflictingBooking(
  bookings: Booking[],
  vehicleId: string,
  pickup: string,
  ret: string,
  holdPending: boolean,
  ignoreBookingId?: string,
) {
  return bookings.find(
    (booking) =>
      booking.vehicleId === vehicleId &&
      booking.id !== ignoreBookingId &&
      blocksCalendar(booking.status, holdPending) &&
      rangesOverlap(pickup, ret, booking.pickupDate, booking.returnDate),
  )
}

export function isPubliclyBookable(vehicle: Vehicle) {
  return vehicle.listingStatus === 'approved' && vehicle.listingActive
}

export interface ScheduleInput {
  vehicleId: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  rentalType: RentalType
  ignoreBookingId?: string
  customerId?: string
}

/** Same customer re-submitting after a partial success (e.g. contract upload retry). */
export function findMatchingPendingBooking(
  bookings: Booking[],
  customerId: string,
  input: Pick<ScheduleInput, 'vehicleId' | 'pickupDate' | 'returnDate' | 'pickupTime' | 'returnTime'>,
) {
  return bookings.find(
    (booking) =>
      isUuid(booking.id) &&
      booking.customerId === customerId &&
      booking.status === 'pending' &&
      booking.vehicleId === input.vehicleId &&
      booking.pickupDate === input.pickupDate &&
      booking.returnDate === input.returnDate &&
      booking.pickupTime === input.pickupTime &&
      booking.returnTime === input.returnTime,
  )
}

export function scheduleIssues(input: ScheduleInput, data: Pick<DemoData, 'vehicles' | 'bookings' | 'maintenance' | 'settings'>) {
  const issues: string[] = []
  const vehicle = data.vehicles.find((item) => item.id === input.vehicleId)
  if (!vehicle) return ['Vehicle not found.']
  if (!isPubliclyBookable(vehicle) && vehicle.listingStatus !== 'approved') {
    issues.push('This vehicle is not available for booking.')
  }
  if (!vehicle.listingActive || vehicle.listingStatus === 'archived' || vehicle.listingStatus === 'rejected') {
    issues.push('This vehicle is not available for booking.')
  }
  const today = manilaYmd()
  if (!input.pickupDate || !input.returnDate) {
    issues.push('Choose a pickup date and a return date.')
    return issues
  }
  if (input.pickupDate < today) issues.push('Pickup date cannot be in the past.')
  if (input.pickupDate === today && input.pickupTime < manilaTime()) {
    issues.push('Pickup time cannot be in the past.')
  }
  const startStamp = `${input.pickupDate}T${input.pickupTime || '00:00'}`
  const endStamp = `${input.returnDate}T${input.returnTime || '00:00'}`
  if (endStamp <= startStamp) issues.push('Return date and time must be later than pickup.')
  if (input.returnDate < input.pickupDate) issues.push('Return date must be later than pickup date.')
  const clash = conflictingBooking(
    data.bookings,
    vehicle.id,
    input.pickupDate,
    input.returnDate,
    data.settings.holdPendingBookings,
    input.ignoreBookingId,
  )
  if (clash) {
    if (input.customerId && clash.customerId === input.customerId && clash.status === 'pending') {
      issues.push(
        `You already have pending booking ${clash.reference} for these dates. Open My Bookings or submit again to finish that request.`,
      )
    } else {
      issues.push(`Those dates overlap ${clash.reference}.`)
    }
  }
  const maintenance = data.maintenance.find(
    (window) => window.vehicleId === vehicle.id && maintenanceOverlaps(input.pickupDate, input.returnDate, window),
  )
  if (maintenance) issues.push(`The vehicle is blocked for ${maintenance.reason.toLowerCase()}.`)
  return [...new Set(issues)]
}

export function homeForRole(role: string) {
  if (role === 'admin') return '/admin'
  if (role === 'owner') return '/partner'
  if (role === 'partner') return '/partner'
  return '/customer'
}
