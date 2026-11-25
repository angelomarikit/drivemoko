import type { Booking } from '@/types'

/** Fixed commission split on booking quote total (`pricing.total`). */
export const PARTNER_COMMISSION_RATE = 0.7
export const COMPANY_COMMISSION_RATE = 0.3

export const PARTNER_COMMISSION_PERCENT = 70
export const COMPANY_COMMISSION_PERCENT = 30

export function partnerCommissionForBooking(booking: Booking): number {
  return Math.round(booking.pricing.total * PARTNER_COMMISSION_RATE)
}

export function companyCommissionForBooking(booking: Booking): number {
  return booking.pricing.total - partnerCommissionForBooking(booking)
}