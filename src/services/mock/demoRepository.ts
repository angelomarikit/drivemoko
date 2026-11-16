import type { DemoRepository } from '@/services/repositories/types'
import { useDemoStore } from '@/stores/demoStore'
import type { InquiryInput, MaintenanceInput, Settings } from '@/types'

function data() {
  return useDemoStore.getState()
}

export const demoRepository: DemoRepository = {
  snapshot: () => {
    const state = data()
    return {
      users: state.users,
      vehicles: state.vehicles,
      bookings: state.bookings,
      payments: state.payments,
      maintenance: state.maintenance,
      favorites: state.favorites,
      notifications: state.notifications,
      smsTemplates: state.smsTemplates,
      smsLogs: state.smsLogs,
      applications: state.applications,
      inquiries: state.inquiries,
      reviews: state.reviews,
      settings: state.settings,
      sessionUserId: state.sessionUserId,
      bookingSeq: state.bookingSeq,
      version: state.version,
    }
  },
  vehicles: {
    list: async () => data().vehicles,
    get: async (id) => data().vehicles.find((vehicle) => vehicle.id === id) ?? null,
    create: async (input, actorId) => data().createVehicle(input, actorId),
    update: async (id, patch, actorId) => data().updateVehicle(id, patch, actorId),
    archive: async (id, actorId) => data().archiveVehicle(id, actorId),
  },
  bookings: {
    list: async () => data().bookings,
    create: async (input) => data().createBooking(input),
    transition: async (id, status, actorId, note) => data().transitionBooking(id, status, actorId, note),
    update: async (id, patch, actorId) => data().updateBooking(id, patch, actorId),
  },
  users: {
    list: async () => data().users,
    create: async (input, actorId) => data().createUser(input, actorId),
    update: async (id, patch, actorId) => data().updateUser(id, patch, actorId),
  },
  payments: {
    list: async () => data().payments,
    record: async (input) => data().recordPayment(input),
    verify: async (id, actorId) => data().verifyPayment(id, actorId),
    reject: async (id, actorId, reason) => data().rejectPayment(id, actorId, reason),
  },
  partners: {
    listApplications: async () => data().applications,
    submit: async (input) => data().submitApplication(input),
    review: async (id, decision, actorId, shareRate, reviewNote) => data().reviewApplication(id, decision, actorId, shareRate, reviewNote),
  },
  notifications: {
    list: async () => data().notifications,
    markRead: async (id) => data().markNotificationRead(id),
    markAll: async (userId) => data().markAllNotificationsRead(userId),
    sendSms: async (input) => data().sendSms(input),
  },
}

export const maintenanceRepository = {
  add: (input: MaintenanceInput) => data().addMaintenance(input),
  remove: (id: string, actorId: string) => data().removeMaintenance(id, actorId),
}

export const sessionRepository = {
  login: (userId: string) => data().login(userId),
  registerCustomer: (input: import('@/types').UserInput) => data().registerCustomer(input),
  logout: () => data().logout(),
  reset: () => data().resetDemo(),
  resetFull: () => data().resetDemoFull(),
  favorite: (userId: string, vehicleId: string) => data().toggleFavorite(userId, vehicleId),
  inquiry: (input: InquiryInput) => data().createInquiry(input),
  saveTemplate: (id: string, body: string, actorId: string) => data().updateTemplate(id, body, actorId),
  saveSettings: (patch: Partial<Settings>, actorId: string) => data().updateSettings(patch, actorId),
}
