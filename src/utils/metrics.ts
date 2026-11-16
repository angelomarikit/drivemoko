import type { Booking, DemoData, Payment, Role, User, Vehicle } from '@/types'
import { addDays, diffDays, formatMonthDay, manilaYmd } from '@/utils/dates'
import { percentChange } from '@/utils/money'

const EARNING_STATUSES = new Set(['confirmed', 'ongoing', 'completed'])

export function shareAmount(
  booking: Booking,
  vehicle: Vehicle | undefined,
  users: User[],
  settings: DemoData['settings'],
  viewer: { role: Role; id: string },
) {
  if (!vehicle) return 0
  const gross = booking.pricing.total
  if (viewer.role === 'admin' || viewer.role === 'customer') return gross
  if (viewer.role === 'partner') {
    if (vehicle.partnerId !== viewer.id) return 0
    const partner = users.find((user) => user.id === viewer.id)
    const rate = partner?.shareRate ?? settings.defaultPartnerShare
    return Math.round(gross * (rate / 100))
  }
  if (vehicle.ownerId !== viewer.id) return 0
  const partner = users.find((user) => user.id === vehicle.partnerId)
  const ownerPercent = partner ? 100 - (partner.shareRate ?? settings.defaultPartnerShare) : 100 - settings.companyCommissionRate
  return Math.round(gross * (ownerPercent / 100))
}

export function scopedVehicles(vehicles: Vehicle[], role: Role, userId: string) {
  if (role === 'admin') return vehicles
  if (role === 'owner') return vehicles.filter((vehicle) => vehicle.ownerId === userId)
  if (role === 'partner') return vehicles.filter((vehicle) => vehicle.partnerId === userId)
  return vehicles.filter((vehicle) => vehicle.listingStatus === 'approved' && vehicle.listingActive)
}

export function scopedBookings(bookings: Booking[], vehicles: Vehicle[], role: Role, userId: string) {
  if (role === 'admin') return bookings
  if (role === 'customer') return bookings.filter((booking) => booking.customerId === userId)
  const ids = new Set(scopedVehicles(vehicles, role, userId).map((vehicle) => vehicle.id))
  return bookings.filter((booking) => ids.has(booking.vehicleId))
}

function windowPair(today = manilaYmd()) {
  return {
    today,
    start: addDays(today, -30),
    prevStart: addDays(today, -60),
  }
}

function inLast(ymd: string, today: string) {
  return ymd >= addDays(today, -30) && ymd <= today
}

function inPrev(ymd: string, today: string) {
  return ymd >= addDays(today, -60) && ymd < addDays(today, -30)
}

export function bookingKpis(bookings: Booking[], payments: Payment[], users: User[]) {
  const { today } = windowPair()
  const countable = bookings.filter((booking) => booking.status !== 'rejected')
  const recent = countable.filter((booking) => inLast(booking.pickupDate, today))
  const previous = countable.filter((booking) => inPrev(booking.pickupDate, today))
  const active = bookings.filter((booking) => booking.status === 'ongoing')
  const activeRecent = active.filter((booking) => inLast(booking.pickupDate, today)).length
  const activePrev = bookings.filter((booking) => booking.status === 'completed' && inPrev(booking.returnDate, today)).length
  const revenue = payments.filter((payment) => payment.status === 'verified').reduce((sum, payment) => sum + payment.amount, 0)
  const revenueRecent = payments
    .filter((payment) => payment.status === 'verified' && inLast(payment.createdAt.slice(0, 10), today))
    .reduce((sum, payment) => sum + payment.amount, 0)
  const revenuePrev = payments
    .filter((payment) => payment.status === 'verified' && inPrev(payment.createdAt.slice(0, 10), today))
    .reduce((sum, payment) => sum + payment.amount, 0)
  const recentUsers = users.filter((user) => inLast(user.createdAt.slice(0, 10), today)).length
  const prevUsers = users.filter((user) => inPrev(user.createdAt.slice(0, 10), today)).length
  return {
    totalBookings: countable.length,
    bookingsDelta: percentChange(recent.length, previous.length),
    activeRentals: active.length,
    activeDelta: percentChange(activeRecent, activePrev),
    revenue,
    revenueDelta: percentChange(revenueRecent, revenuePrev),
    users: users.length,
    usersDelta: percentChange(recentUsers, prevUsers),
  }
}

export function earningsTotal(bookings: Booking[], vehicles: Vehicle[], users: User[], settings: DemoData['settings'], viewer: { role: Role; id: string }) {
  const { today } = windowPair()
  const rows = bookings.filter((booking) => EARNING_STATUSES.has(booking.status))
  const amount = (booking: Booking) => shareAmount(booking, vehicles.find((vehicle) => vehicle.id === booking.vehicleId), users, settings, viewer)
  const total = rows.reduce((sum, booking) => sum + amount(booking), 0)
  const recent = rows.filter((booking) => inLast(booking.pickupDate, today)).reduce((sum, booking) => sum + amount(booking), 0)
  const previous = rows.filter((booking) => inPrev(booking.pickupDate, today)).reduce((sum, booking) => sum + amount(booking), 0)
  return { total, delta: percentChange(recent, previous) }
}

export function utilization(vehicles: Vehicle[], bookings: Booking[], today = manilaYmd()) {
  if (vehicles.length === 0) return 0
  const start = addDays(today, -30)
  const occupied = vehicles.reduce((sum, vehicle) => {
    const days = new Set<string>()
    bookings
      .filter((booking) => booking.vehicleId === vehicle.id && EARNING_STATUSES.has(booking.status))
      .forEach((booking) => {
        const from = booking.pickupDate > start ? booking.pickupDate : start
        const to = booking.returnDate < today ? booking.returnDate : today
        let cursor = from
        while (cursor < to) {
          days.add(cursor)
          const [year, month, day] = cursor.split('-').map(Number)
          const date = new Date(Date.UTC(year, month - 1, day + 1))
          cursor = date.toISOString().slice(0, 10)
        }
      })
    return sum + days.size
  }, 0)
  return Math.round((occupied / (vehicles.length * 30)) * 100)
}

export function dailySeries(
  bookings: Booking[],
  payments: Payment[],
  metric: 'bookings' | 'revenue' | 'rentals',
  today = manilaYmd(),
) {
  return Array.from({ length: 8 }, (_, index) => {
    const day = addDays(today, index - 7)
    let value = 0
    if (metric === 'bookings') {
      value = bookings.filter((booking) => booking.createdAt.slice(0, 10) === day || booking.pickupDate === day).length
    } else if (metric === 'revenue') {
      value = payments
        .filter((payment) => payment.status === 'verified' && payment.createdAt.slice(0, 10) === day)
        .reduce((sum, payment) => sum + payment.amount, 0)
    } else {
      value = bookings.filter(
        (booking) =>
          (booking.status === 'confirmed' || booking.status === 'ongoing' || booking.status === 'completed') &&
          booking.pickupDate <= day &&
          day < booking.returnDate,
      ).length
    }
    return { label: formatMonthDay(day), value }
  })
}

export function weeklyBars(
  bookings: Booking[],
  vehicles: Vehicle[],
  users: User[],
  settings: DemoData['settings'],
  viewer: { role: Role; id: string },
  today = manilaYmd(),
) {
  return Array.from({ length: 5 }, (_, index) => {
    const end = addDays(today, -7 * (4 - index))
    const start = addDays(end, -7)
    const value = bookings
      .filter((booking) => EARNING_STATUSES.has(booking.status) && booking.pickupDate >= start && booking.pickupDate < end)
      .reduce((sum, booking) => sum + shareAmount(booking, vehicles.find((vehicle) => vehicle.id === booking.vehicleId), users, settings, viewer), 0)
    return { label: formatMonthDay(end), value }
  })
}

export function coveredDays(booking: Booking, start: string, end: string) {
  const from = booking.pickupDate > start ? booking.pickupDate : start
  const to = booking.returnDate < end ? booking.returnDate : end
  return Math.max(0, diffDays(from, to))
}

export function statusCounts(bookings: Booking[]) {
  return (['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'rejected'] as const).map((status) => ({
    status,
    count: bookings.filter((booking) => booking.status === status).length,
  }))
}
