export type NotificationTemplateKey =
  | 'booking_request_received'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'payment_submitted'
  | 'payment_verified'
  | 'pickup_reminder'
  | 'return_reminder'
  | 'partner_application_approved'
  | 'partner_vehicle_approved'

type TemplateDef = { subject: string; preview: string }

export const EMAIL_TEMPLATES: Record<NotificationTemplateKey, TemplateDef> = {
  booking_request_received: {
    subject: 'Drive Moko — booking request received',
    preview: 'We received your reservation request. Our team will review it shortly.',
  },
  booking_confirmed: {
    subject: 'Drive Moko — booking confirmed',
    preview: 'Your rental is confirmed. See pickup details in your dashboard.',
  },
  booking_rejected: {
    subject: 'Drive Moko — booking update',
    preview: 'Your booking request could not be approved.',
  },
  booking_cancelled: {
    subject: 'Drive Moko — booking cancelled',
    preview: 'Your booking was cancelled.',
  },
  payment_submitted: {
    subject: 'Drive Moko — payment received for review',
    preview: 'We received your payment details.',
  },
  payment_verified: {
    subject: 'Drive Moko — payment verified',
    preview: 'Your payment has been verified.',
  },
  pickup_reminder: {
    subject: 'Drive Moko — pickup reminder',
    preview: 'Your vehicle pickup is coming up.',
  },
  return_reminder: {
    subject: 'Drive Moko — return reminder',
    preview: 'Please return the vehicle on time.',
  },
  partner_application_approved: {
    subject: 'Drive Moko — partner application approved',
    preview: 'Welcome to the Links / Partner program.',
  },
  partner_vehicle_approved: {
    subject: 'Drive Moko — vehicle listing approved',
    preview: 'Your vehicle is now visible on the public catalog.',
  },
}

export const SMS_TEMPLATES: Partial<Record<NotificationTemplateKey, string>> = {
  booking_confirmed: 'Drive Moko: Booking {reference} confirmed. Pickup {pickupDate}.',
  booking_rejected: 'Drive Moko: Booking {reference} was not approved.',
  booking_cancelled: 'Drive Moko: Booking {reference} cancelled.',
  pickup_reminder: 'Drive Moko: Pickup tomorrow for booking {reference}.',
  return_reminder: 'Drive Moko: Return due {returnDate} for booking {reference}.',
}