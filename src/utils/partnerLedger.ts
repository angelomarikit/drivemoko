import type { Booking, DemoData, PartnerDisbursement, User, Vehicle } from '@/types'
import type { PartnerEarning } from '@/types/financial'
import { addDays, formatMonthDay, manilaYmd } from '@/utils/dates'
import { shareAmount } from '@/utils/metrics'

const EARNING_STATUSES = new Set<Booking['status']>(['confirmed', 'ongoing', 'completed'])

export type PartnerRentalLine = {
  bookingId: string
  reference: string
  partnerId: string
  partnerName: string
  vehicleId: string
  vehicleName: string
  pickupDate: string
  returnDate: string
  shareAmount: number
  payoutStatus: 'unpaid' | 'paid'
  paidAt?: string
  payoutReference?: string
}

export type PartnerNetworkStats = {
  activePartners: number
  fleetCount: number
  rentalCount: number
  shareEarned: number
  outstandingPayable: number
  totalDisbursed: number
}

export type PartnerSliceStats = Omit<PartnerNetworkStats, 'activePartners'> & {
  partnerId: string
}

export function partnerVehicles(vehicles: Vehicle[], partnerId: string) {
  return vehicles.filter((vehicle) => vehicle.partnerId === partnerId)
}

function partnerBookings(data: Pick<DemoData, 'bookings' | 'vehicles'>, partnerId?: string) {
  const partnerVehicleIds = new Set(
    data.vehicles.filter((vehicle) => vehicle.partnerId && (!partnerId || vehicle.partnerId === partnerId)).map((v) => v.id),
  )
  return data.bookings.filter(
    (booking) => EARNING_STATUSES.has(booking.status) && partnerVehicleIds.has(booking.vehicleId),
  )
}

export function buildPartnerRentalLines(
  data: Pick<DemoData, 'bookings' | 'vehicles' | 'users' | 'settings'>,
  disbursements: PartnerDisbursement[],
  earnings?: PartnerEarning[],
  partnerId?: string,
): PartnerRentalLine[] {
  const bookings = partnerBookings(data, partnerId)
  const earningByBooking = new Map((earnings ?? []).map((row) => [row.bookingId, row]))

  const raw = bookings
    .map((booking) => {
      const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId)
      if (!vehicle?.partnerId) return null
      const partner = data.users.find((user) => user.id === vehicle.partnerId)
      const earning = earningByBooking.get(booking.id)
      const share = earning
        ? earning.partnerShareCentavos / 100
        : shareAmount(booking, vehicle, data.users, data.settings, { role: 'partner', id: vehicle.partnerId })
      return {
        bookingId: booking.id,
        reference: booking.reference,
        partnerId: vehicle.partnerId,
        partnerName: partner?.name ?? 'Partner',
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        shareAmount: share,
        earningSettled: earning?.status === 'settled',
        earningPaidAt: earning?.recognizedAt,
      }
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate) || a.reference.localeCompare(b.reference))

  const disbursedByPartner = new Map<string, number>()
  for (const row of disbursements) {
    if (partnerId && row.partnerId !== partnerId) continue
    disbursedByPartner.set(row.partnerId, (disbursedByPartner.get(row.partnerId) ?? 0) + row.amount)
  }

  const linesWithFifo: PartnerRentalLine[] = []
  const fifoPool = new Map<string, number>()
  for (const row of raw) {
    if (row.earningSettled) {
      linesWithFifo.push({
        bookingId: row.bookingId,
        reference: row.reference,
        partnerId: row.partnerId,
        partnerName: row.partnerName,
        vehicleId: row.vehicleId,
        vehicleName: row.vehicleName,
        pickupDate: row.pickupDate,
        returnDate: row.returnDate,
        shareAmount: row.shareAmount,
        payoutStatus: 'paid',
        paidAt: row.earningPaidAt?.slice(0, 10),
      })
      continue
    }
    const pool = fifoPool.get(row.partnerId) ?? disbursedByPartner.get(row.partnerId) ?? 0
    const remaining = pool - row.shareAmount
    const paid = remaining >= -0.01
    fifoPool.set(row.partnerId, Math.max(0, remaining))
    linesWithFifo.push({
      bookingId: row.bookingId,
      reference: row.reference,
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      vehicleId: row.vehicleId,
      vehicleName: row.vehicleName,
      pickupDate: row.pickupDate,
      returnDate: row.returnDate,
      shareAmount: row.shareAmount,
      payoutStatus: paid ? 'paid' : 'unpaid',
    })
  }
  return linesWithFifo
}

export function totalDisbursed(disbursements: PartnerDisbursement[], partnerId?: string) {
  return disbursements
    .filter((row) => !partnerId || row.partnerId === partnerId)
    .reduce((sum, row) => sum + row.amount, 0)
}

export function shareEarnedFromLines(lines: PartnerRentalLine[]) {
  return Math.round(lines.reduce((sum, line) => sum + line.shareAmount, 0))
}

export function outstandingFromEarnedAndDisbursed(earned: number, disbursed: number) {
  return Math.max(0, Math.round(earned - disbursed))
}

export function partnerSliceStats(
  data: Pick<DemoData, 'bookings' | 'vehicles' | 'users' | 'settings'>,
  disbursements: PartnerDisbursement[],
  partnerId: string,
  earnings?: PartnerEarning[],
): PartnerSliceStats {
  const lines = buildPartnerRentalLines(data, disbursements, earnings, partnerId)
  const earned = shareEarnedFromLines(lines)
  const disbursed = totalDisbursed(disbursements, partnerId)
  return {
    partnerId,
    fleetCount: partnerVehicles(data.vehicles, partnerId).length,
    rentalCount: lines.length,
    shareEarned: earned,
    totalDisbursed: disbursed,
    outstandingPayable: outstandingFromEarnedAndDisbursed(earned, disbursed),
  }
}

export function globalPartnerStats(
  data: Pick<DemoData, 'bookings' | 'vehicles' | 'users' | 'settings'>,
  disbursements: PartnerDisbursement[],
  earnings?: PartnerEarning[],
): PartnerNetworkStats {
  const partners = data.users.filter((user) => user.role === 'partner' && user.status === 'active')
  const lines = buildPartnerRentalLines(data, disbursements, earnings)
  const earned = shareEarnedFromLines(lines)
  const disbursed = totalDisbursed(disbursements)
  return {
    activePartners: partners.length,
    fleetCount: data.vehicles.filter((vehicle) => vehicle.partnerId).length,
    rentalCount: lines.length,
    shareEarned: earned,
    totalDisbursed: disbursed,
    outstandingPayable: outstandingFromEarnedAndDisbursed(earned, disbursed),
  }
}

export function partnerDirectoryRowStats(
  data: Pick<DemoData, 'bookings' | 'vehicles' | 'users' | 'settings'>,
  disbursements: PartnerDisbursement[],
  partner: User,
  earnings?: PartnerEarning[],
) {
  return partnerSliceStats(data, disbursements, partner.id, earnings)
}

export function weeklyPartnerShareSeries(
  lines: PartnerRentalLine[],
  weeks = 8,
  today = manilaYmd(),
): { label: string; value: number }[] {
  const result: { label: string; value: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const end = addDays(today, -i * 7)
    const start = addDays(end, -6)
    const value = lines
      .filter((line) => line.pickupDate >= start && line.pickupDate <= end)
      .reduce((sum, line) => sum + line.shareAmount, 0)
    result.push({ label: formatMonthDay(start), value: Math.round(value) })
  }
  return result
}

export function payableByPartner(
  data: Pick<DemoData, 'bookings' | 'vehicles' | 'users' | 'settings'>,
  disbursements: PartnerDisbursement[],
  earnings?: PartnerEarning[],
  limit = 8,
): { name: string; value: number }[] {
  const partners = data.users.filter((user) => user.role === 'partner')
  return partners
    .map((partner) => {
      const stats = partnerSliceStats(data, disbursements, partner.id, earnings)
      return { name: partner.name.length > 18 ? `${partner.name.slice(0, 16)}…` : partner.name, value: stats.outstandingPayable }
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export function displayPartnerName(user: User) {
  if (user.name && user.name !== user.email) return user.name
  return user.partnerProfile?.contactPerson || user.partnerProfile?.businessName || user.email
}

/** Profiles that participate as fleet partners (role partner or linked on a vehicle). */
export function listPartnerAccounts(data: Pick<DemoData, 'users' | 'vehicles'>): User[] {
  const linkedIds = new Set(
    data.vehicles.map((vehicle) => vehicle.partnerId).filter((id): id is string => Boolean(id)),
  )
  const seen = new Set<string>()
  const accounts: User[] = []
  for (const user of data.users) {
    if (user.role !== 'partner' && !linkedIds.has(user.id)) continue
    if (seen.has(user.id)) continue
    seen.add(user.id)
    accounts.push(user)
  }
  return accounts.sort((a, b) => displayPartnerName(a).localeCompare(displayPartnerName(b)))
}