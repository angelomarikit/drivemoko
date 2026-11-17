import type { Booking, Payment, Vehicle } from '@/types'
import type { PartnerEarning } from '@/types/financial'

export function verifiedRevenueInRange(payments: Payment[], start: string, end: string) {
  return payments
    .filter((p) => p.status === 'verified' && p.createdAt.slice(0, 10) >= start && p.createdAt.slice(0, 10) <= end)
    .reduce((sum, p) => sum + p.amount, 0)
}

export function outstandingReceivables(bookings: Booking[], payments: Payment[]) {
  return bookings
    .filter((b) => !['cancelled', 'rejected'].includes(b.status) && b.paymentStatus !== 'paid')
    .reduce((sum, b) => {
      const paid = payments
        .filter((p) => p.bookingId === b.id && p.status === 'verified')
        .reduce((s, p) => s + p.amount, 0)
      return sum + Math.max(0, b.pricing.total - paid)
    }, 0)
}

export function cancellationsInRange(bookings: Booking[], start: string, end: string) {
  return bookings.filter(
    (b) =>
      (b.status === 'cancelled' || b.status === 'rejected') &&
      b.createdAt.slice(0, 10) >= start &&
      b.createdAt.slice(0, 10) <= end,
  ).length
}

export function revenueByVehicle(bookings: Booking[], vehicles: Vehicle[], payments: Payment[]) {
  const verifiedByBooking = new Map<string, number>()
  payments
    .filter((p) => p.status === 'verified')
    .forEach((p) => verifiedByBooking.set(p.bookingId, (verifiedByBooking.get(p.bookingId) ?? 0) + p.amount))
  return vehicles
    .map((v) => ({
      name: v.name,
      revenue: bookings
        .filter((b) => b.vehicleId === v.id)
        .reduce((sum, b) => sum + (verifiedByBooking.get(b.id) ?? 0), 0),
    }))
    .filter((row) => row.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

export function ownerVerifiedEarnings(
  bookings: Booking[],
  vehicles: Vehicle[],
  payments: Payment[],
  settings: { companyCommissionRate: number },
  ownerId: string,
  partnerEarnings: PartnerEarning[],
) {
  const earningByBooking = new Map(partnerEarnings.map((e) => [e.bookingId, e]))
  return bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => {
      const vehicle = vehicles.find((v) => v.id === b.vehicleId)
      if (!vehicle || vehicle.ownerId !== ownerId) return sum
      const verified = payments
        .filter((p) => p.bookingId === b.id && p.status === 'verified')
        .reduce((s, p) => s + p.amount, 0)
      if (verified <= 0) return sum
      const pe = earningByBooking.get(b.id)
      if (pe) return sum + Math.max(0, verified - pe.partnerShareCentavos / 100)
      return sum + Math.round(verified * ((100 - settings.companyCommissionRate) / 100))
    }, 0)
}

export function businessSharePesos(earnings: PartnerEarning[]) {
  return earnings.reduce((s, e) => s + e.companyShareCentavos / 100, 0)
}

export function partnerEarningsSummary(earnings: PartnerEarning[]) {
  const payable = earnings.filter((e) => e.status === 'payable' || e.status === 'in_settlement')
  const settled = earnings.filter((e) => e.status === 'settled')
  return {
    payableCentavos: payable.reduce((s, e) => s + e.partnerShareCentavos, 0),
    settledCentavos: settled.reduce((s, e) => s + e.partnerShareCentavos, 0),
    pendingCentavos: earnings.filter((e) => e.status === 'pending').reduce((s, e) => s + e.partnerShareCentavos, 0),
  }
}

export function dailyRevenueSeries(payments: Payment[], days = 14, today = new Date().toISOString().slice(0, 10)) {
  const result: { label: string; value: number }[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const ymd = d.toISOString().slice(0, 10)
    const value = payments
      .filter((p) => p.status === 'verified' && p.createdAt.slice(0, 10) === ymd)
      .reduce((sum, p) => sum + p.amount, 0)
    result.push({ label: ymd.slice(5), value })
  }
  return result
}