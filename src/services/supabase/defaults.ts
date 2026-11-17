import type { DemoData, Settings, SmsTemplate } from '@/types'
import { DEFAULT_DRIVER_PACKAGE } from '@/utils/driverPackage'
import { DEFAULT_PARTNER_FIXED_SHARE } from '@/utils/partnerShare'
import { DEFAULT_RENTAL_PACKAGE } from '@/utils/rentalPackage'

export const DEFAULT_SETTINGS: Settings = {
  holdPendingBookings: true,
  companyCommissionRate: 30,
  defaultPartnerShare: 70,
  defaultPartnerFixedShare: { ...DEFAULT_PARTNER_FIXED_SHARE },
  ownersCanBlockAvailability: true,
  smsSenderName: 'DriveMoko',
  locations: [
    'Solano',
    'Bayombong',
    'Bambang',
    'Bagabag',
    'Aritao',
    'Quezon',
    'Diadi',
    'Kasibu',
    'Villaverde',
    'Outside Nueva Vizcaya',
  ],
  defaultRentalPackage: { ...DEFAULT_RENTAL_PACKAGE },
  defaultDriverPackage: { ...DEFAULT_DRIVER_PACKAGE },
  securityDepositAmount: 3000,
}

export const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  { id: 'tpl-confirmation', key: 'confirmation', name: 'Booking confirmation', body: 'Drive Moko: Booking {{reference}} is confirmed. Pickup {{pickupDate}} {{pickupTime}}.' },
  { id: 'tpl-cancel', key: 'cancellation', name: 'Cancellation', body: 'Drive Moko: Booking {{reference}} was cancelled.' },
  { id: 'tpl-reminder', key: 'rental_reminder', name: 'Rental reminder', body: 'Drive Moko: Reminder for {{reference}} pickup tomorrow.' },
  { id: 'tpl-return', key: 'return_reminder', name: 'Return reminder', body: 'Drive Moko: Return {{reference}} by {{returnDate}} {{returnTime}}.' },
  { id: 'tpl-custom', key: 'custom', name: 'Custom message', body: 'Drive Moko: {{message}}' },
]

export function emptySnapshotTail(sessionUserId: string | null): Pick<
  DemoData,
  | 'payments'
  | 'partnerDisbursements'
  | 'favorites'
  | 'notifications'
  | 'smsTemplates'
  | 'smsLogs'
  | 'applications'
  | 'inquiries'
  | 'reviews'
  | 'settings'
  | 'bookingSeq'
  | 'version'
> {
  return {
    payments: [],
    partnerDisbursements: [],
    favorites: [],
    notifications: [],
    smsTemplates: DEFAULT_SMS_TEMPLATES,
    smsLogs: [],
    applications: [],
    inquiries: [],
    reviews: [],
    settings: DEFAULT_SETTINGS,
    bookingSeq: 100,
    version: 0,
  }
}