import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isSupabaseProvider } from '@/lib/config'
import { syncSessionUserToDemoStore } from '@/hooks/useSyncSupabaseProfileToDemo'
import { useSupabaseSession } from '@/providers/AuthProvider'
import { useAuthSessionStore } from '@/stores/authSessionStore'
import { registerCustomer as supabaseRegister, signOut as supabaseSignOut } from '@/services/auth/authService'
import { createPartnerSettlement, markSettlementPaid } from '@/services/supabase/financial'
import { saveSupabaseSettings } from '@/services/supabase/settings'
import { repositories, maintenanceRepository, sessionRepository, createInquiry, toggleFavorite } from '@/services'
import { useDemoStore } from '@/stores/demoStore'
import { useDataVersionStore } from '@/stores/dataVersionStore'
import type { BookingStatus, CreateBookingInput, UserInput, VehicleInput } from '@/types'

export { useAppReady, useHydrated } from '@/hooks/useAppReady'

export function useSession() {
  const sessionUserId = useDemoStore((state) => state.sessionUserId)
  const users = useDemoStore((state) => state.users)
  const demoUser = users.find((user) => user.id === sessionUserId) ?? null
  const { user: supabaseUser } = useSupabaseSession()
  const storeUser = useAuthSessionStore((state) => state.user)
  if (isSupabaseProvider()) return storeUser ?? supabaseUser
  return demoUser
}

export function useSnapshot() {
  const mockVersion = useDemoStore((state) => state.version)
  const dataVersion = useDataVersionStore((state) => state.version)
  const session = useSession()
  const versionKey = isSupabaseProvider() ? dataVersion : mockVersion
  return useQuery({
    queryKey: ['snapshot', versionKey, session?.id, isSupabaseProvider() ? 'supabase' : 'mock'],
    queryFn: async () => {
      const data = await Promise.resolve(repositories.snapshot())
      return data
    },
  })
}

async function run<T>(work: () => Promise<T> | T, success?: string) {
  try {
    const result = await work()
    if (isSupabaseProvider()) useDataVersionStore.getState().bump()
    if (success) toast.success(success)
    return result
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Something went wrong.')
    throw error
  }
}

export function useDemoActions() {
  const session = useSession()
  syncSessionUserToDemoStore(session)
  const actorId = session?.id ?? ''
  return {
    session,
    login: (userId: string) => {
      if (isSupabaseProvider()) {
        return Promise.reject(new Error('Use email and password sign-in.'))
      }
      return run(() => sessionRepository.login(userId), 'Demo session started')
    },
    logout: () =>
      run(async () => {
        if (isSupabaseProvider()) {
          await supabaseSignOut()
          return
        }
        sessionRepository.logout()
      }),
    reset: () => run(() => sessionRepository.reset(), 'Walkthrough demo reset'),
    resetFull: () => run(() => sessionRepository.resetFull(), 'Full sample history loaded'),
    favorite: (vehicleId: string) => {
      const id = session?.id ?? 'guest'
      return run(async () => {
        if (isSupabaseProvider()) {
          if (!session) throw new Error('Sign in to save favorites.')
          return toggleFavorite(session.id, vehicleId)
        }
        sessionRepository.favorite(id, vehicleId)
      })
    },
    createBooking: (input: Omit<CreateBookingInput, 'actorId'>) =>
      run(() => repositories.bookings.create({ ...input, actorId: session?.id ?? null }), 'Booking request sent'),
    transition: (id: string, status: BookingStatus, note?: string) =>
      run(() => repositories.bookings.transition(id, status, actorId, note), `Booking marked ${status}`),
    updateBooking: (id: string, patch: Parameters<typeof repositories.bookings.update>[1]) =>
      run(() => repositories.bookings.update(id, patch, actorId), 'Booking updated'),
    createVehicle: (input: VehicleInput) => run(() => repositories.vehicles.create(input, actorId), 'Vehicle saved'),
    updateVehicle: (id: string, patch: Partial<VehicleInput>) =>
      run(() => repositories.vehicles.update(id, patch, actorId), 'Vehicle updated'),
    archiveVehicle: (id: string) => run(() => repositories.vehicles.archive(id, actorId), 'Vehicle archived'),
    addMaintenance: (input: Omit<import('@/types').MaintenanceInput, 'actorId'>) =>
      run(() => maintenanceRepository.add({ ...input, actorId }), 'Dates blocked'),
    removeMaintenance: (id: string) => run(() => maintenanceRepository.remove(id, actorId), 'Block removed'),
    recordPayment: (input: Omit<import('@/types').PaymentInput, 'actorId'>) =>
      run(() => repositories.payments.record({ ...input, actorId }), 'Payment recorded'),
    verifyPayment: (id: string) => run(() => repositories.payments.verify(id, actorId), 'Payment verified'),
    rejectPayment: (id: string, reason: string) => run(() => repositories.payments.reject(id, actorId, reason), 'Payment rejected'),
    createSettlement: (partnerId: string, periodStart: string, periodEnd: string) =>
      run(
        async () => {
          if (!isSupabaseProvider()) throw new Error('Settlements require Supabase.')
          return createPartnerSettlement(partnerId, periodStart, periodEnd)
        },
        'Settlement draft created',
      ),
    markSettlementPaid: (settlementId: string, payoutReference: string, notes?: string) =>
      run(
        async () => {
          if (!isSupabaseProvider()) throw new Error('Settlements require Supabase.')
          await markSettlementPaid(settlementId, payoutReference, notes)
        },
        'Settlement marked paid',
      ),
    registerCustomer: (input: UserInput) =>
      run(async () => {
        if (isSupabaseProvider()) {
          throw new Error('Use the registration form with a password.')
        }
        return sessionRepository.registerCustomer(input)
      }, 'Demo customer created'),
    createUser: (input: import('@/types').UserInput) => run(() => repositories.users.create(input, actorId), 'Account added'),
    updateUser: (id: string, patch: Partial<import('@/types').User>) =>
      run(() => repositories.users.update(id, patch, actorId), 'Account updated'),
    savePartnerAdminProfile: (partnerId: string, input: import('@/types').PartnerAdminInput) =>
      run(() => repositories.partners.saveAdminProfile(partnerId, input, actorId), 'Partner rates saved'),
    recordPartnerDisbursement: (input: import('@/types').RecordPartnerDisbursementInput) =>
      run(() => repositories.partners.recordDisbursement(input, actorId), 'Disbursement recorded'),
    submitApplication: (input: import('@/types').ApplicationInput) =>
      run(() => repositories.partners.submit(input), 'Application submitted'),
    reviewApplication: (id: string, decision: 'approved' | 'rejected' | 'needs_info', shareRate?: number, reviewNote?: string) =>
      run(() => repositories.partners.review(id, decision, actorId, shareRate, reviewNote), 'Application updated'),
    inquiry: (input: import('@/types').InquiryInput) =>
      run(async () => {
        if (isSupabaseProvider()) await createInquiry(input)
        else sessionRepository.inquiry(input)
      }, 'Message sent'),
    markRead: (id: string) => repositories.notifications.markRead(id),
    markAll: () => session && repositories.notifications.markAll(session.id),
    sendSms: (input: Omit<import('@/types').SmsInput, 'actorId'>) =>
      run(async () => {
        if (isSupabaseProvider()) {
          toast.message('SMS is on hold. Templates are saved in-app; live sending comes in a later phase.')
          return
        }
        await repositories.notifications.sendSms({ ...input, actorId })
      }, isSupabaseProvider() ? undefined : 'Simulated SMS recorded'),
    saveTemplate: (id: string, body: string) => run(() => sessionRepository.saveTemplate(id, body, actorId), 'Template saved'),
    saveSettings: (patch: Partial<import('@/types').Settings>) =>
      run(async () => {
        if (isSupabaseProvider()) {
          await saveSupabaseSettings(patch)
          return
        }
        sessionRepository.saveSettings(patch, actorId)
      }, 'Settings saved'),
  }
}
