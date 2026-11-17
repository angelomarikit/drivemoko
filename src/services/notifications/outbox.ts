import { getSupabaseClient } from '@/lib/supabase/client'
import { isSupabaseProvider } from '@/lib/config'
import type { NotificationTemplateKey } from '@/services/notifications/templates'

type Channel = 'email' | 'sms' | 'in_app'

export async function enqueueNotification(input: {
  channel: Channel
  templateKey: NotificationTemplateKey
  idempotencyKey: string
  payload: Record<string, unknown>
  recipientUserId?: string
  recipientEmail?: string
  recipientPhone?: string
}) {
  if (!isSupabaseProvider()) return null
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('enqueue_notification', {
    p_channel: input.channel,
    p_template_key: input.templateKey,
    p_idempotency_key: input.idempotencyKey,
    p_payload: input.payload,
    p_recipient_user_id: input.recipientUserId ?? null,
    p_recipient_email: input.recipientEmail ?? null,
    p_recipient_phone: input.recipientPhone ?? null,
  })
  if (error) {
    if (error.message.includes('enqueue_notification') || error.code === '42883') {
      return null
    }
    throw new Error(error.message)
  }
  return data as string | null
}

export async function enqueueBookingStatusEmails(booking: {
  id: string
  reference: string
  status: string
  customerId: string
  customerEmail?: string
}) {
  const map: Partial<Record<string, NotificationTemplateKey>> = {
    pending: 'booking_request_received',
    confirmed: 'booking_confirmed',
    rejected: 'booking_rejected',
    cancelled: 'booking_cancelled',
  }
  const templateKey = map[booking.status]
  if (!templateKey) return
  await enqueueNotification({
    channel: 'email',
    templateKey,
    idempotencyKey: `booking:${booking.id}:${booking.status}:email`,
    recipientUserId: booking.customerId,
    recipientEmail: booking.customerEmail,
    payload: { reference: booking.reference, status: booking.status },
  })
  await enqueueNotification({
    channel: 'in_app',
    templateKey,
    idempotencyKey: `booking:${booking.id}:${booking.status}:in_app`,
    recipientUserId: booking.customerId,
    payload: { reference: booking.reference, status: booking.status },
  })
}