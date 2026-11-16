import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { demoRepository, maintenanceRepository, sessionRepository } from '@/services/mock/demoRepository'
import { useDemoStore } from '@/stores/demoStore'
import type { BookingStatus, CreateBookingInput, VehicleInput } from '@/types'

export function useHydrated() {
  const [hydrated, setHydrated] = useState(useDemoStore.persist.hasHydrated())
  useEffect(() => {
    if (useDemoStore.persist.hasHydrated()) setHydrated(true)
    return useDemoStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])
  return hydrated
}

export function useSession() {
  const sessionUserId = useDemoStore((state) => state.sessionUserId)
  const users = useDemoStore((state) => state.users)
  return users.find((user) => user.id === sessionUserId) ?? null
}

export function useSnapshot() {
  const version = useDemoStore((state) => state.version)
  const sessionUserId = useDemoStore((state) => state.sessionUserId)
  const snapshot = demoRepository.snapshot()
  return useQuery({
    queryKey: ['snapshot', version, sessionUserId],
    queryFn: async () => demoRepository.snapshot(),
    initialData: snapshot,
  })
}

async function run<T>(work: () => Promise<T> | T, success?: string) {
  try {
    const result = await work()
    if (success) toast.success(success)
    return result
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Something went wrong.')
    throw error
  }
}

export function useDemoActions() {
  const session = useSession()
  const actorId = session?.id ?? ''
  return {
    session,
    login: (userId: string) => run(() => sessionRepository.login(userId), 'Demo session started'),
    logout: () => run(() => sessionRepository.logout()),
    reset: () => run(() => sessionRepository.reset(), 'Walkthrough demo reset'),
    resetFull: () => run(() => sessionRepository.resetFull(), 'Full sample history loaded'),
    favorite: (vehicleId: string) => {
      const id = session?.id ?? 'guest'
      return run(() => sessionRepository.favorite(id, vehicleId))
    },
    createBooking: (input: Omit<CreateBookingInput, 'actorId'>) =>
      run(() => demoRepository.bookings.create({ ...input, actorId: session?.id ?? null }), 'Booking request sent'),
    transition: (id: string, status: BookingStatus, note?: string) =>
      run(() => demoRepository.bookings.transition(id, status, actorId, note), `Booking marked ${status}`),
    updateBooking: (id: string, patch: Parameters<typeof demoRepository.bookings.update>[1]) =>
      run(() => demoRepository.bookings.update(id, patch, actorId), 'Booking updated'),
    createVehicle: (input: VehicleInput) => run(() => demoRepository.vehicles.create(input, actorId), 'Vehicle saved'),
    updateVehicle: (id: string, patch: Partial<VehicleInput>) =>
      run(() => demoRepository.vehicles.update(id, patch, actorId), 'Vehicle updated'),
    archiveVehicle: (id: string) => run(() => demoRepository.vehicles.archive(id, actorId), 'Vehicle archived'),
    addMaintenance: (input: Omit<import('@/types').MaintenanceInput, 'actorId'>) =>
      run(() => maintenanceRepository.add({ ...input, actorId }), 'Dates blocked'),
    removeMaintenance: (id: string) => run(() => maintenanceRepository.remove(id, actorId), 'Block removed'),
    recordPayment: (input: Omit<import('@/types').PaymentInput, 'actorId'>) =>
      run(() => demoRepository.payments.record({ ...input, actorId }), 'Payment recorded'),
    verifyPayment: (id: string) => run(() => demoRepository.payments.verify(id, actorId), 'Payment verified'),
    rejectPayment: (id: string, reason: string) => run(() => demoRepository.payments.reject(id, actorId, reason), 'Payment rejected'),
    registerCustomer: (input: import('@/types').UserInput) => run(() => sessionRepository.registerCustomer(input), 'Demo customer created'),
    createUser: (input: import('@/types').UserInput) => run(() => demoRepository.users.create(input, actorId), 'Account added'),
    updateUser: (id: string, patch: Partial<import('@/types').User>) =>
      run(() => demoRepository.users.update(id, patch, actorId), 'Account updated'),
    submitApplication: (input: import('@/types').ApplicationInput) =>
      run(() => demoRepository.partners.submit(input), 'Application submitted'),
    reviewApplication: (id: string, decision: 'approved' | 'rejected' | 'needs_info', shareRate?: number, reviewNote?: string) =>
      run(() => demoRepository.partners.review(id, decision, actorId, shareRate, reviewNote), 'Application updated'),
    inquiry: (input: import('@/types').InquiryInput) => run(() => sessionRepository.inquiry(input), 'Message sent'),
    markRead: (id: string) => demoRepository.notifications.markRead(id),
    markAll: () => session && demoRepository.notifications.markAll(session.id),
    sendSms: (input: Omit<import('@/types').SmsInput, 'actorId'>) =>
      run(() => demoRepository.notifications.sendSms({ ...input, actorId }), 'Simulated SMS recorded'),
    saveTemplate: (id: string, body: string) => run(() => sessionRepository.saveTemplate(id, body, actorId), 'Template saved'),
    saveSettings: (patch: Partial<import('@/types').Settings>) => run(() => sessionRepository.saveSettings(patch, actorId), 'Settings saved'),
  }
}
