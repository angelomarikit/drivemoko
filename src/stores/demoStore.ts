import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createFullSeed, createMinimalSeed } from '@/data/seed'
import { isSupabaseProvider } from '@/lib/config'
import { createBooking as createSupabaseBooking } from '@/services/supabase/bookings'
import { persistRenterDocuments } from '@/services/bookingDocuments'
import { persistBookingContract } from '@/services/bookingContract'
import type {
  ApplicationInput,
  Booking,
  BookingStatus,
  CreateBookingInput,
  DemoData,
  InquiryInput,
  MaintenanceInput,
  PartnerAdminInput,
  PartnerDisbursement,
  Payment,
  RecordPartnerDisbursementInput,
  PaymentInput,
  PaymentStatus,
  Role,
  SmsInput,
  User,
  UserInput,
  Vehicle,
  VehicleInput,
} from '@/types'
import { findMatchingPendingBooking, scheduleIssues } from '@/utils/bookingRules'
import { canTransition } from '@/utils/bookingRules'
import { DEFAULT_SETTINGS } from '@/services/supabase/defaults'
import { quotePackage } from '@/utils/pricing'
import { partnerSliceStats } from '@/utils/partnerLedger'
import { resolveRentalPackage } from '@/utils/rentalPackage'

export class DemoError extends Error {}

interface DemoActions {
  login: (userId: string) => void
  logout: () => void
  resetDemo: () => void
  resetDemoFull: () => void
  toggleFavorite: (userId: string, vehicleId: string) => void
  createBooking: (input: CreateBookingInput) => Promise<Booking>
  transitionBooking: (id: string, status: BookingStatus, actorId: string, note?: string) => Booking
  updateBooking: (id: string, patch: Partial<Booking>, actorId: string) => Booking
  createVehicle: (input: VehicleInput, actorId: string) => Vehicle
  updateVehicle: (id: string, patch: Partial<Vehicle>, actorId: string) => Vehicle
  deleteVehicle: (id: string, actorId: string) => void
  addMaintenance: (input: MaintenanceInput) => void
  removeMaintenance: (id: string, actorId: string) => void
  recordPayment: (input: PaymentInput) => Payment
  verifyPayment: (id: string, actorId: string) => void
  rejectPayment: (id: string, actorId: string, reason: string) => void
  registerCustomer: (input: UserInput) => User
  createUser: (input: UserInput, actorId: string) => User
  updateUser: (id: string, patch: Partial<User>, actorId: string) => User
  savePartnerAdminProfile: (partnerId: string, input: PartnerAdminInput, actorId: string) => void
  recordPartnerDisbursement: (input: RecordPartnerDisbursementInput, actorId: string) => PartnerDisbursement
  submitApplication: (input: ApplicationInput) => void
  reviewApplication: (id: string, decision: 'approved' | 'rejected' | 'needs_info', actorId: string, shareRate?: number, reviewNote?: string) => void
  createInquiry: (input: InquiryInput) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void
  sendSms: (input: SmsInput) => void
  updateTemplate: (id: string, body: string, actorId: string) => void
  updateSettings: (patch: Partial<DemoData['settings']>, actorId: string) => void
}

export type DemoState = DemoData & DemoActions

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function actorName(users: User[], actorId: string | null) {
  if (!actorId) return 'Guest'
  return users.find((user) => user.id === actorId)?.name ?? 'Demo user'
}

function fanout(users: User[], target: { role?: Role; id?: string }, title: string, body: string, href?: string) {
  return users
    .filter((user) => (target.id ? user.id === target.id : user.role === target.role))
    .map((user) => ({
      id: uid('ntf'),
      userId: user.id,
      title,
      body,
      read: false,
      createdAt: new Date().toISOString(),
      href,
    }))
}

function paymentStatusOf(bookingId: string, payments: Payment[], total: number): PaymentStatus {
  const related = payments.filter((payment) => payment.bookingId === bookingId)
  const verified = related.filter((payment) => payment.status === 'verified').reduce((sum, payment) => sum + payment.amount, 0)
  if (verified >= total && total > 0) return 'paid'
  if (verified > 0) return 'partial'
  if (related.some((payment) => payment.status === 'pending')) return 'pending'
  if (related.some((payment) => payment.status === 'rejected')) return 'rejected'
  return 'unpaid'
}

function requireAdmin(users: User[], actorId: string) {
  const actor = users.find((user) => user.id === actorId)
  if (!actor || actor.role !== 'admin') throw new DemoError('Only an administrator can do that.')
  return actor
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...createMinimalSeed(),
      login: (userId) => {
        const account = get().users.find((user) => user.id === userId)
        if (!account) throw new DemoError('Demo account not found.')
        if (account.status === 'suspended') throw new DemoError('This demo account is suspended.')
        set({ sessionUserId: account.id, version: get().version + 1 })
      },
      logout: () => set({ sessionUserId: null, version: get().version + 1 }),
      resetDemo: () => {
        const sessionUserId = get().sessionUserId
        const seed = createMinimalSeed()
        set({
          ...seed,
          sessionUserId: seed.users.some((user) => user.id === sessionUserId) ? sessionUserId : null,
        })
      },
      resetDemoFull: () => {
        const sessionUserId = get().sessionUserId
        const seed = createFullSeed()
        set({
          ...seed,
          sessionUserId: seed.users.some((user) => user.id === sessionUserId) ? sessionUserId : null,
        })
      },
      toggleFavorite: (userId, vehicleId) => {
        const favorites = get().favorites
        const exists = favorites.some((favorite) => favorite.userId === userId && favorite.vehicleId === vehicleId)
        set({
          favorites: exists
            ? favorites.filter((favorite) => !(favorite.userId === userId && favorite.vehicleId === vehicleId))
            : [...favorites, { userId, vehicleId }],
          version: get().version + 1,
        })
      },
      createBooking: async (input) => {
        if (isSupabaseProvider()) {
          return createSupabaseBooking(input)
        }
        const state = get()
        const vehicle = state.vehicles.find((item) => item.id === input.vehicleId)
        if (!vehicle) throw new DemoError('Vehicle not found.')
        let users = state.users
        let customerId = input.customerId
        if (input.customer) {
          const email = input.customer.email.trim().toLowerCase()
          const existing = users.find((user) => user.email.toLowerCase() === email)
          if (existing) {
            customerId = existing.id
            users = users.map((user) =>
              user.id === existing.id
                ? {
                    ...user,
                    name: input.customer!.name,
                    phone: input.customer!.phone,
                    address: input.customer!.address,
                    licenseNumber: input.customer!.licenseNumber || user.licenseNumber,
                    emergencyName: input.customer!.emergencyName || user.emergencyName,
                    emergencyPhone: input.customer!.emergencyPhone || user.emergencyPhone,
                  }
                : user,
            )
          } else if (!customerId) {
            const created: User = {
              id: uid('user'),
              role: 'customer',
              name: input.customer.name,
              email: input.customer.email.trim(),
              phone: input.customer.phone,
              address: input.customer.address,
              title: 'Customer',
              status: 'active',
              licenseNumber: input.customer.licenseNumber,
              emergencyName: input.customer.emergencyName,
              emergencyPhone: input.customer.emergencyPhone,
              createdAt: new Date().toISOString(),
            }
            users = [...users, created]
            customerId = created.id
          }
        }
        if (!customerId) throw new DemoError('Customer information is required.')
        const existingPending = findMatchingPendingBooking(state.bookings, customerId, input)
        const issues = scheduleIssues(
          { ...input, customerId, ignoreBookingId: existingPending?.id },
          state,
        )
        if (issues.length) throw new DemoError(issues[0])
        const pkg = resolveRentalPackage(vehicle, state.settings, input.rentalZone ?? 'inside')
        const pricing = quotePackage(
          pkg,
          input.pickupDate,
          input.returnDate,
          input.rentalType,
          input.addons,
          input.driverZone,
          state.settings.defaultDriverPackage,
          state.settings.securityDepositAmount,
        )
        if (existingPending) {
          let contractStoragePath = existingPending.contractStoragePath
          let contractSignedAt = existingPending.contractSignedAt
          let contractSignerName = existingPending.contractSignerName
          if (input.contract) {
            const saved = await persistBookingContract(existingPending.id, existingPending.reference, input.contract)
            contractStoragePath = saved.contractStoragePath
            contractSignedAt = saved.contractSignedAt
            contractSignerName = saved.contractSignerName
          }
          const docPaths = input.renterDocuments
            ? await persistRenterDocuments(existingPending.id, input.renterDocuments)
            : {}
          const booking: Booking = {
            ...existingPending,
            pickupLocation: input.pickupLocation,
            rentalType: input.rentalType,
            addons: input.addons,
            specialRequest: input.specialRequest,
            documentName: docPaths.license ?? input.documentName,
            validIdStoragePath: docPaths.validId,
            proofOfBillingStoragePath: docPaths.proofOfBilling,
            pricing,
            contractStoragePath,
            contractSignedAt,
            contractSignerName,
          }
          set({
            users,
            bookings: state.bookings.map((item) => (item.id === booking.id ? booking : item)),
            version: state.version + 1,
          })
          return booking
        }
        let seq = state.bookingSeq
        let reference = `DM-2026-${String(seq).padStart(4, '0')}`
        while (state.bookings.some((booking) => booking.reference === reference)) {
          seq += 1
          reference = `DM-2026-${String(seq).padStart(4, '0')}`
        }
        const bookingId = uid('bkg')
        const docPaths = input.renterDocuments ? await persistRenterDocuments(bookingId, input.renterDocuments) : {}
        const booking: Booking = {
          id: bookingId,
          reference,
          vehicleId: vehicle.id,
          customerId,
          pickupLocation: input.pickupLocation,
          pickupDate: input.pickupDate,
          returnDate: input.returnDate,
          pickupTime: input.pickupTime,
          returnTime: input.returnTime,
          rentalType: input.rentalType,
          addons: input.addons,
          specialRequest: input.specialRequest,
          documentName: docPaths.license ?? input.documentName,
          validIdStoragePath: docPaths.validId,
          proofOfBillingStoragePath: docPaths.proofOfBilling,
          status: 'pending',
          paymentStatus: 'unpaid',
          pricing,
          notes: '',
          history: [
            {
              id: uid('hist'),
              at: new Date().toISOString(),
              action: 'Booking request created',
              by: actorName(users, input.actorId),
            },
          ],
          createdAt: new Date().toISOString(),
        }
        if (input.contract) {
          const saved = await persistBookingContract(booking.id, reference, input.contract)
          booking.contractStoragePath = saved.contractStoragePath
          booking.contractSignedAt = saved.contractSignedAt
          booking.contractSignerName = saved.contractSignerName
        }
        const customer = users.find((user) => user.id === customerId)
        const noteBody = `${customer?.name ?? 'A customer'} requested ${vehicle.name} (${reference}).`
        const notifications = [
          ...state.notifications,
          ...fanout(users, { role: 'admin' }, 'New booking', noteBody, '/admin/bookings'),
          ...fanout(users, { id: customerId }, 'Booking received', `${reference} is pending confirmation.`, '/customer/bookings'),
          ...(vehicle.partnerId ? fanout(users, { id: vehicle.partnerId }, 'Rental request', noteBody, '/partner/reservations') : []),
        ]
        set({ users, bookings: [booking, ...state.bookings], bookingSeq: seq + 1, notifications, version: state.version + 1 })
        return booking
      },
      transitionBooking: (id, status, actorId, note) => {
        const state = get()
        const current = state.bookings.find((booking) => booking.id === id)
        if (!current) throw new DemoError('Booking not found.')
        if (!canTransition(current.status, status)) {
          throw new DemoError(`A ${current.status} booking cannot move to ${status}.`)
        }
        if (status === 'confirmed' || status === 'ongoing') {
          const issues = scheduleIssues({ ...current, ignoreBookingId: current.id }, state)
          if (issues.length) throw new DemoError(issues[0])
        }
        const action =
          status === 'confirmed'
            ? 'Booking confirmed'
            : status === 'rejected'
              ? 'Booking rejected'
              : status === 'cancelled'
                ? 'Booking cancelled'
                : status === 'ongoing'
                  ? 'Vehicle released'
                  : 'Vehicle returned'
        const booking: Booking = {
          ...current,
          status,
          notes: note ? `${current.notes ? `${current.notes}\n` : ''}${note}` : current.notes,
          history: [...current.history, { id: uid('hist'), at: new Date().toISOString(), action, by: actorName(state.users, actorId) }],
        }
        const vehicle = state.vehicles.find((item) => item.id === booking.vehicleId)
        const body = `${booking.reference} is now ${status}.`
        const notifications = [
          ...state.notifications,
          ...fanout(state.users, { id: booking.customerId }, 'Booking update', body, '/customer/bookings'),
          ...(vehicle?.partnerId ? fanout(state.users, { id: vehicle.partnerId }, 'Booking update', body, '/partner/reservations') : []),
          ...fanout(state.users, { role: 'admin' }, 'Booking update', body, '/admin/bookings'),
        ]
        set({
          bookings: state.bookings.map((item) => (item.id === id ? booking : item)),
          notifications,
          version: state.version + 1,
        })
        return booking
      },
      updateBooking: (id, patch, actorId) => {
        const state = get()
        requireAdmin(state.users, actorId)
        const current = state.bookings.find((booking) => booking.id === id)
        if (!current) throw new DemoError('Booking not found.')
        if (current.status === 'completed' || current.status === 'cancelled' || current.status === 'rejected') {
          throw new DemoError('This booking can no longer be edited.')
        }
        const next: Booking = {
          ...current,
          ...patch,
          id: current.id,
          reference: current.reference,
          history: current.history,
        }
        const issues = scheduleIssues({ ...next, ignoreBookingId: id }, state)
        if (issues.length) throw new DemoError(issues[0])
        const vehicle = state.vehicles.find((item) => item.id === next.vehicleId)
        if (!vehicle) throw new DemoError('Vehicle not found.')
        const pkg = resolveRentalPackage(vehicle, get().settings, 'inside')
        next.pricing = quotePackage(
          pkg,
          next.pickupDate,
          next.returnDate,
          next.rentalType,
          next.addons,
          undefined,
          get().settings.defaultDriverPackage,
          get().settings.securityDepositAmount,
        )
        next.paymentStatus = paymentStatusOf(next.id, state.payments, next.pricing.total)
        next.history = [...current.history, { id: uid('hist'), at: new Date().toISOString(), action: 'Booking details updated', by: actorName(state.users, actorId) }]
        set({
          bookings: state.bookings.map((booking) => (booking.id === id ? next : booking)),
          version: state.version + 1,
        })
        return next
      },
      createVehicle: (input, actorId) => {
        const state = get()
        const actor = state.users.find((user) => user.id === actorId)
        if (!actor || actor.role === 'customer') throw new DemoError('You cannot add a vehicle.')
        let vehicle: Vehicle = { ...input, id: uid('veh'), createdAt: new Date().toISOString() }
        if (actor.role === 'partner' || actor.role === 'owner') {
          vehicle = { ...vehicle, partnerId: actor.id, ownerId: null, listingStatus: 'pending', listingActive: false }
        }
        set({
          vehicles: [vehicle, ...state.vehicles],
          notifications: [...state.notifications, ...fanout(state.users, { role: 'admin' }, 'Vehicle submitted', `${actor.name} submitted ${vehicle.name}.`, '/admin/vehicles')],
          version: state.version + 1,
        })
        return vehicle
      },
      updateVehicle: (id, patch, actorId) => {
        const state = get()
        const actor = state.users.find((user) => user.id === actorId)
        const current = state.vehicles.find((vehicle) => vehicle.id === id)
        if (!actor || !current) throw new DemoError('Vehicle not found.')
        if (actor.role === 'customer') throw new DemoError('You cannot edit vehicles.')
        if ((actor.role === 'partner' || actor.role === 'owner') && current.partnerId !== actor.id) {
          throw new DemoError('You can only update your own listings.')
        }
        const nextPatch = { ...patch }
        if (nextPatch.promoVideo === '') nextPatch.promoVideo = undefined
        if (actor.role !== 'admin') {
          delete nextPatch.ownerId
          delete nextPatch.partnerId
          if (nextPatch.listingStatus && nextPatch.listingStatus !== 'pending') delete nextPatch.listingStatus
          if (nextPatch.listingActive && current.listingStatus !== 'approved') nextPatch.listingActive = false
        }
        const vehicle = { ...current, ...nextPatch, id: current.id }
        set({
          vehicles: state.vehicles.map((item) => (item.id === id ? vehicle : item)),
          notifications: [
            ...state.notifications,
            ...fanout(state.users, { role: 'admin' }, 'Vehicle updated', `${actor.name} updated ${vehicle.name}.`, '/admin/vehicles'),
          ],
          version: state.version + 1,
        })
        return vehicle
      },
      deleteVehicle: (id, actorId) => {
        requireAdmin(get().users, actorId)
        const state = get()
        set({
          vehicles: state.vehicles.filter((vehicle) => vehicle.id !== id),
          version: state.version + 1,
        })
      },
      addMaintenance: (input) => {
        const state = get()
        const actor = state.users.find((user) => user.id === input.actorId)
        const vehicle = state.vehicles.find((item) => item.id === input.vehicleId)
        if (!actor || !vehicle) throw new DemoError('Vehicle not found.')
        const allowed =
          actor.role === 'admin' ||
          ((actor.role === 'partner' || actor.role === 'owner') &&
            vehicle.partnerId === actor.id &&
            state.settings.ownersCanBlockAvailability)
        if (!allowed) throw new DemoError('You cannot block dates for this vehicle.')
        if (input.endDate < input.startDate) throw new DemoError('The end date must be on or after the start date.')
        set({
          maintenance: [
            ...state.maintenance,
            { id: uid('mnt'), vehicleId: input.vehicleId, startDate: input.startDate, endDate: input.endDate, reason: input.reason, createdBy: actor.id },
          ],
          version: state.version + 1,
        })
      },
      removeMaintenance: (id, actorId) => {
        const state = get()
        const actor = state.users.find((user) => user.id === actorId)
        const window = state.maintenance.find((item) => item.id === id)
        if (!actor || !window) throw new DemoError('Block not found.')
        if (actor.role !== 'admin' && window.createdBy !== actor.id) throw new DemoError('You cannot remove this block.')
        set({ maintenance: state.maintenance.filter((item) => item.id !== id), version: state.version + 1 })
      },
      recordPayment: (input) => {
        const state = get()
        requireAdmin(state.users, input.actorId)
        const booking = state.bookings.find((item) => item.id === input.bookingId)
        if (!booking) throw new DemoError('Booking not found.')
        if (input.amount <= 0) throw new DemoError('Enter a payment amount.')
        const payment: Payment = {
          id: uid('pay'),
          bookingId: booking.id,
          amount: input.amount,
          method: input.method,
          status: input.markVerified ? 'verified' : 'pending',
          reference: input.reference || `DEMO-${booking.reference}`,
          note: input.note,
          recordedBy: input.actorId,
          createdAt: new Date().toISOString(),
        }
        const payments = [payment, ...state.payments]
        const paymentStatus = paymentStatusOf(booking.id, payments, booking.pricing.total)
        set({
          payments,
          bookings: state.bookings.map((item) => (item.id === booking.id ? { ...item, paymentStatus } : item)),
          notifications: [
            ...state.notifications,
            ...fanout(state.users, { id: booking.customerId }, 'Payment update', `${booking.reference} payment is ${paymentStatus}.`, '/customer/bookings'),
          ],
          version: state.version + 1,
        })
        return payment
      },
      verifyPayment: (id, actorId) => {
        const state = get()
        requireAdmin(state.users, actorId)
        const current = state.payments.find((payment) => payment.id === id)
        if (!current) throw new DemoError('Payment not found.')
        const payments = state.payments.map((payment) => (payment.id === id ? { ...payment, status: 'verified' as const } : payment))
        const booking = state.bookings.find((item) => item.id === current.bookingId)
        set({
          payments,
          bookings: state.bookings.map((item) =>
            item.id === current.bookingId && booking ? { ...item, paymentStatus: paymentStatusOf(item.id, payments, booking.pricing.total) } : item,
          ),
          notifications: booking
            ? [...state.notifications, ...fanout(state.users, { id: booking.customerId }, 'Payment verified', `${booking.reference} payment was verified.`, '/customer/bookings')]
            : state.notifications,
          version: state.version + 1,
        })
      },
      rejectPayment: (id, actorId, reason) => {
        const state = get()
        requireAdmin(state.users, actorId)
        const current = state.payments.find((payment) => payment.id === id)
        if (!current) throw new DemoError('Payment not found.')
        const payments = state.payments.map((payment) =>
          payment.id === id ? { ...payment, status: 'rejected' as const, note: reason || payment.note } : payment,
        )
        const booking = state.bookings.find((item) => item.id === current.bookingId)
        set({
          payments,
          bookings: state.bookings.map((item) =>
            item.id === current.bookingId && booking ? { ...item, paymentStatus: paymentStatusOf(item.id, payments, booking.pricing.total) } : item,
          ),
          version: state.version + 1,
        })
      },
      registerCustomer: (input: UserInput) => {
        const state = get()
        if (state.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
          throw new DemoError('That email is already in the demo directory.')
        }
        const created: User = {
          id: uid('user'),
          role: 'customer',
          name: input.name,
          email: input.email.trim(),
          phone: input.phone,
          address: input.address,
          title: 'Customer',
          status: 'active',
          createdAt: new Date().toISOString(),
        }
        set({ users: [...state.users, created], version: state.version + 1 })
        return created
      },
      createUser: (input, actorId) => {
        const state = get()
        requireAdmin(state.users, actorId)
        if (state.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
          throw new DemoError('That email is already in the demo directory.')
        }
        const created: User = {
          id: uid('user'),
          role: input.role,
          name: input.name,
          email: input.email.trim(),
          phone: input.phone,
          address: input.address,
          title: input.role === 'partner' ? 'Partner (Link)' : 'Customer',
          status: 'active',
          notes: input.notes,
          partnerProfile:
            input.role === 'partner'
              ? {
                  businessName: '',
                  vehicleCount: 0,
                  ownershipType: 'owned',
                  vehicleSummary: '',
                  contractReference: '',
                  contractNotes: '',
                  contactPerson: input.name,
                }
              : undefined,
          createdAt: new Date().toISOString(),
        }
        set({ users: [...state.users, created], version: state.version + 1 })
        return created
      },
      updateUser: (id, patch, actorId) => {
        const state = get()
        const actor = state.users.find((user) => user.id === actorId)
        const current = state.users.find((user) => user.id === id)
        if (!actor || !current) throw new DemoError('Account not found.')
        if (actor.role !== 'admin' && actor.id !== current.id) throw new DemoError('You cannot edit this account.')
        if ((patch.status || patch.shareRate !== undefined || patch.role) && actor.role !== 'admin') {
          throw new DemoError('Only an administrator can change access or share rate.')
        }
        const next = { ...current, ...patch, id: current.id, email: patch.email?.trim() || current.email }
        set({ users: state.users.map((user) => (user.id === id ? next : user)), version: state.version + 1 })
        return next
      },
      savePartnerAdminProfile: (partnerId, input, actorId) => {
        const state = get()
        requireAdmin(state.users, actorId)
        const current = state.users.find((user) => user.id === partnerId)
        if (!current || current.role !== 'partner') throw new DemoError('Partner not found.')
        const partnerProfile = {
          businessName: current.partnerProfile?.businessName ?? '',
          vehicleCount: current.partnerProfile?.vehicleCount ?? 0,
          ownershipType: current.partnerProfile?.ownershipType ?? 'owned' as const,
          vehicleSummary: current.partnerProfile?.vehicleSummary ?? '',
          contractReference: current.partnerProfile?.contractReference ?? '',
          contractNotes: current.partnerProfile?.contractNotes ?? '',
          contactPerson: current.partnerProfile?.contactPerson ?? current.name,
          agreementSignedAt: current.partnerProfile?.agreementSignedAt,
          rentalPackage: input.rentalPackage ?? current.partnerProfile?.rentalPackage,
        }
        const users = state.users.map((user) =>
          user.id === partnerId
            ? {
                ...user,
                name: input.name?.trim() || user.name,
                notes: input.notes ?? user.notes,
                partnerProfile,
              }
            : user,
        )
        const vehicles =
          input.rentalPackage != null
            ? state.vehicles.map((vehicle) =>
                vehicle.partnerId === partnerId
                  ? {
                      ...vehicle,
                      rentalPackage: input.rentalPackage!,
                      pricePerDay: input.rentalPackage!.rateFirstDay,
                    }
                  : vehicle,
              )
            : state.vehicles
        set({ users, vehicles, version: state.version + 1 })
      },
      recordPartnerDisbursement: (input, actorId) => {
        const state = get()
        requireAdmin(state.users, actorId)
        const partner = state.users.find((user) => user.id === input.partnerId)
        if (!partner || partner.role !== 'partner') throw new DemoError('Partner not found.')
        if (input.amount <= 0) throw new DemoError('Enter a positive amount.')
        if (!input.payoutReference.trim()) throw new DemoError('Payout reference is required.')
        const stats = partnerSliceStats(state, state.partnerDisbursements ?? [], input.partnerId)
        if (input.amount > stats.outstandingPayable + 0.01) {
          throw new DemoError(`Amount exceeds outstanding payable (${stats.outstandingPayable}).`)
        }
        const row: PartnerDisbursement = {
          id: uid('disb'),
          partnerId: input.partnerId,
          amount: Math.round(input.amount * 100) / 100,
          payoutReference: input.payoutReference.trim(),
          method: input.method ?? 'gcash',
          paidAt: new Date().toISOString(),
          notes: input.notes,
          createdBy: actorId,
        }
        set({
          partnerDisbursements: [row, ...(state.partnerDisbursements ?? [])],
          version: state.version + 1,
        })
        return row
      },
      submitApplication: (input) => {
        const state = get()
        const application = {
          id: uid('app'),
          ...input,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        }
        set({
          applications: [application, ...state.applications],
          notifications: [...state.notifications, ...fanout(state.users, { role: 'admin' }, 'Partner application', `${input.fullName} applied to list a vehicle.`, '/admin/partners')],
          version: state.version + 1,
        })
      },
      reviewApplication: (id, decision, actorId, shareRate, reviewNote) => {
        const state = get()
        requireAdmin(state.users, actorId)
        const application = state.applications.find((item) => item.id === id)
        if (!application) throw new DemoError('Application not found.')
        let users = state.users
        if (decision === 'approved') {
          const rate = state.settings.defaultPartnerShare
          const existing = users.find((user) => user.email.toLowerCase() === application.email.toLowerCase())
          if (existing && existing.role !== 'partner') throw new DemoError('That email already belongs to another demo role.')
          if (existing) {
            users = users.map((user) => (user.id === existing.id ? { ...user, status: 'active', shareRate: rate } : user))
          } else {
            users = [
              ...users,
              {
                id: uid('user'),
                role: 'partner',
                name: application.fullName,
                email: application.email,
                phone: application.phone,
                address: application.address,
                title: 'Partner (Link)',
                status: 'active',
                shareRate: rate,
                notes: application.vehicleDetails,
                createdAt: new Date().toISOString(),
              },
            ]
          }
        }
        set({
          users,
          applications: state.applications.map((item) =>
            item.id === id ? { ...item, status: decision, shareRate, reviewNote, reviewedAt: new Date().toISOString() } : item,
          ),
          version: state.version + 1,
        })
      },
      createInquiry: (input) => {
        const state = get()
        set({
          inquiries: [{ id: uid('inq'), ...input, createdAt: new Date().toISOString() }, ...state.inquiries],
          notifications: [...state.notifications, ...fanout(state.users, { role: 'admin' }, 'New inquiry', `${input.name} sent a message.`, '/admin/settings')],
          version: state.version + 1,
        })
      },
      markNotificationRead: (id) =>
        set({
          notifications: get().notifications.map((item) => (item.id === id ? { ...item, read: true } : item)),
          version: get().version + 1,
        }),
      markAllNotificationsRead: (userId) =>
        set({
          notifications: get().notifications.map((item) => (item.userId === userId ? { ...item, read: true } : item)),
          version: get().version + 1,
        }),
      sendSms: (input) => {
        requireAdmin(get().users, input.actorId)
        if (!input.to.trim() || !input.body.trim()) throw new DemoError('Phone and message are required.')
        const state = get()
        set({
          smsLogs: [
            {
              id: uid('sms'),
              to: input.to,
              templateId: input.templateId,
              body: input.body,
              status: 'simulated',
              createdAt: new Date().toISOString(),
              bookingId: input.bookingId,
            },
            ...state.smsLogs,
          ],
          version: state.version + 1,
        })
      },
      updateTemplate: (id, body, actorId) => {
        requireAdmin(get().users, actorId)
        set({
          smsTemplates: get().smsTemplates.map((template) => (template.id === id ? { ...template, body } : template)),
          version: get().version + 1,
        })
      },
      updateSettings: (patch, actorId) => {
        requireAdmin(get().users, actorId)
        set({ settings: { ...get().settings, ...patch }, version: get().version + 1 })
      },
    }),
    {
      name: 'drivemoko-demo-v2',
      partialize: (state) => ({
        users: state.users,
        vehicles: state.vehicles,
        bookings: state.bookings,
        payments: state.payments,
        partnerDisbursements: state.partnerDisbursements ?? [],
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
      }),
      merge: (persisted, current) => {
        const data = persisted as Partial<DemoData> | undefined
        if (!data?.users || !data.vehicles || !data.bookings || !data.settings) return current
        return {
          ...current,
          ...data,
          settings: {
            ...DEFAULT_SETTINGS,
            ...current.settings,
            ...data.settings,
            defaultRentalPackage: {
              ...DEFAULT_SETTINGS.defaultRentalPackage,
              ...data.settings?.defaultRentalPackage,
            },
            defaultRentalPackageInside: {
              ...DEFAULT_SETTINGS.defaultRentalPackageInside,
              ...data.settings?.defaultRentalPackageInside,
            },
            defaultDriverPackage: {
              ...DEFAULT_SETTINGS.defaultDriverPackage,
              ...data.settings?.defaultDriverPackage,
            },
            securityDepositAmount:
              data.settings?.securityDepositAmount ?? DEFAULT_SETTINGS.securityDepositAmount,
          },
          partnerDisbursements: data.partnerDisbursements ?? [],
        }
      },
    },
  ),
)
