import type {
  ApplicationInput,
  Booking,
  BookingStatus,
  CreateBookingInput,
  DemoData,
  InquiryInput,
  MaintenanceInput,
  Payment,
  PartnerAdminInput,
  PartnerDisbursement,
  PaymentInput,
  RecordPartnerDisbursementInput,
  SmsInput,
  User,
  UserInput,
  Vehicle,
  VehicleInput,
} from '@/types'

export interface VehicleRepository {
  list: () => Promise<Vehicle[]>
  get: (id: string) => Promise<Vehicle | null>
  create: (input: VehicleInput, actorId: string) => Promise<Vehicle>
  update: (id: string, patch: Partial<Vehicle>, actorId: string) => Promise<Vehicle>
  delete: (id: string, actorId: string) => Promise<void>
}

export interface BookingRepository {
  list: () => Promise<Booking[]>
  create: (input: CreateBookingInput) => Promise<Booking>
  transition: (id: string, status: BookingStatus, actorId: string, note?: string) => Promise<Booking>
  update: (id: string, patch: Partial<Booking>, actorId: string) => Promise<Booking>
}

export interface UserRepository {
  list: () => Promise<User[]>
  create: (input: UserInput, actorId: string) => Promise<User>
  update: (id: string, patch: Partial<User>, actorId: string) => Promise<User>
}

export interface PaymentRepository {
  list: () => Promise<Payment[]>
  record: (input: PaymentInput) => Promise<Payment>
  verify: (id: string, actorId: string) => Promise<void>
  reject: (id: string, actorId: string, reason: string) => Promise<void>
}

export interface PartnerRepository {
  listApplications: () => Promise<DemoData['applications']>
  submit: (input: ApplicationInput) => Promise<void>
  review: (id: string, decision: 'approved' | 'rejected' | 'needs_info', actorId: string, shareRate?: number, reviewNote?: string) => Promise<void>
  saveAdminProfile: (partnerId: string, input: PartnerAdminInput, actorId: string) => Promise<void>
  listDisbursements: (partnerId?: string) => Promise<PartnerDisbursement[]>
  recordDisbursement: (input: RecordPartnerDisbursementInput, actorId: string) => Promise<PartnerDisbursement>
}

export interface NotificationRepository {
  list: () => Promise<DemoData['notifications']>
  markRead: (id: string) => Promise<void>
  markAll: (userId: string) => Promise<void>
  sendSms: (input: SmsInput) => Promise<void>
}

export interface DemoRepository {
  snapshot: () => DemoData | Promise<DemoData>
  vehicles: VehicleRepository
  bookings: BookingRepository
  users: UserRepository
  payments: PaymentRepository
  partners: PartnerRepository
  notifications: NotificationRepository
}
