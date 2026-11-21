import type { DemoRepository } from '@/services/repositories/types'
import { createBooking, transitionBooking, updateBookingNotes } from '@/services/supabase/bookings'
import { toggleFavorite } from '@/services/supabase/favorites'
import { createInquiry } from '@/services/supabase/inquiries'
import { markAllNotificationsRead, markNotificationRead } from '@/services/supabase/notifications'
import { updatePartnerAdminProfile } from '@/services/supabase/partnerAdmin'
import { listPartnerDisbursements, recordPartnerDisbursement } from '@/services/supabase/partnerDisbursements'
import { listApplications, reviewApplication, submitApplication } from '@/services/supabase/partners'
import { listPayments, recordPayment, rejectPayment, verifyPayment } from '@/services/supabase/payments'
import { fetchSupabaseSnapshot } from '@/services/supabase/snapshot'
import { findVehicleByParam } from '@/utils/vehicleParam'
import { createVehicle, deleteVehicle, updateVehicle } from '@/services/supabase/vehicles'
import type { Booking } from '@/types'

const phase4Later = (name: string) => () => {
  throw new Error(`${name} will be enabled when user management is wired to Supabase Auth Admin API.`)
}

export const supabaseRepository: DemoRepository = {
  snapshot: () => fetchSupabaseSnapshot(),
  vehicles: {
    list: async () => (await fetchSupabaseSnapshot()).vehicles,
    get: async (id) => findVehicleByParam((await fetchSupabaseSnapshot()).vehicles, id) ?? null,
    create: createVehicle,
    update: updateVehicle,
    delete: deleteVehicle,
  },
  bookings: {
    list: async () => (await fetchSupabaseSnapshot()).bookings,
    create: createBooking,
    transition: async (id, status, actorId, note) => {
      await transitionBooking(id, status, actorId, note)
      const booking = (await fetchSupabaseSnapshot()).bookings.find((item) => item.id === id)
      if (!booking) throw new Error('Booking not found after update.')
      return { ...booking, status }
    },
    update: async (id, patch, _actorId) => {
      await updateBookingNotes(id, { pickupLocation: patch.pickupLocation, notes: patch.notes })
      const booking = (await fetchSupabaseSnapshot()).bookings.find((item) => item.id === id)
      if (!booking) throw new Error('Booking not found.')
      return { ...booking, ...patch } as Booking
    },
  },
  users: {
    list: async () => (await fetchSupabaseSnapshot()).users,
    create: phase4Later('Create user'),
    update: phase4Later('Update user'),
  },
  payments: {
    list: listPayments,
    record: recordPayment,
    verify: verifyPayment,
    reject: rejectPayment,
  },
  partners: {
    listApplications,
    submit: submitApplication,
    review: reviewApplication,
    saveAdminProfile: updatePartnerAdminProfile,
    listDisbursements: listPartnerDisbursements,
    recordDisbursement: recordPartnerDisbursement,
  },
  notifications: {
    list: async () => (await fetchSupabaseSnapshot()).notifications,
    markRead: markNotificationRead,
    markAll: markAllNotificationsRead,
    sendSms: phase4Later('SMS send'),
  },
}

export { toggleFavorite, createInquiry }