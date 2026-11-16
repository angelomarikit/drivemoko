export type Role = 'admin' | 'owner' | 'partner' | 'customer'
export type VehicleCategory = 'SUV' | 'Sedan' | 'MPV' | 'Van' | 'Pickup' | 'Others'
export type Transmission = 'Automatic' | 'Manual'
export type FuelType = 'Diesel' | 'Gasoline'
export type RentalType = 'self-drive' | 'with-driver'
export type ListingStatus = 'approved' | 'pending' | 'rejected' | 'archived'
export type BookingStatus = 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled' | 'rejected'
export type PaymentStatus = 'unpaid' | 'pending' | 'partial' | 'paid' | 'rejected'
export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank'
export type PaymentRecordStatus = 'pending' | 'verified' | 'rejected'
export type AccountStatus = 'active' | 'suspended'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'needs_info'
export type OwnershipType = 'owned' | 'financed' | 'fleet'

export interface User {
  id: string
  role: Role
  name: string
  email: string
  phone: string
  address: string
  title: string
  status: AccountStatus
  shareRate?: number
  licenseNumber?: string
  emergencyName?: string
  emergencyPhone?: string
  notes?: string
  createdAt: string
}

export interface Review {
  id: string
  vehicleId: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface Vehicle {
  id: string
  name: string
  brand: string
  model: string
  year: number
  category: VehicleCategory
  seats: number
  transmission: Transmission
  fuel: FuelType
  pricePerDay: number
  listingStatus: ListingStatus
  listingActive: boolean
  ownerId: string | null
  partnerId: string | null
  images: string[]
  description: string
  features: string[]
  inclusions: string[]
  plateNumber: string
  offeredRentalTypes: RentalType[]
  airconditioning: boolean
  createdAt: string
}

export interface PriceBreakdown {
  days: number
  dailyRate: number
  base: number
  insurance: number
  driver: number
  childSeat: number
  total: number
}

export interface BookingAddons {
  insurance: boolean
  withDriver: boolean
  childSeat: boolean
}

export interface BookingHistoryEntry {
  id: string
  at: string
  action: string
  by: string
}

export interface Booking {
  id: string
  reference: string
  vehicleId: string
  customerId: string
  pickupLocation: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  rentalType: RentalType
  addons: BookingAddons
  specialRequest: string
  documentName?: string
  status: BookingStatus
  paymentStatus: PaymentStatus
  pricing: PriceBreakdown
  notes: string
  history: BookingHistoryEntry[]
  createdAt: string
}

export interface Payment {
  id: string
  bookingId: string
  amount: number
  method: PaymentMethod
  status: PaymentRecordStatus
  reference: string
  note: string
  recordedBy: string
  createdAt: string
}

export interface MaintenanceWindow {
  id: string
  vehicleId: string
  startDate: string
  endDate: string
  reason: string
  createdBy: string
}

export interface Favorite {
  userId: string
  vehicleId: string
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  body: string
  read: boolean
  createdAt: string
  href?: string
}

export interface SmsTemplate {
  id: string
  key: 'confirmation' | 'cancellation' | 'rental_reminder' | 'return_reminder' | 'custom'
  name: string
  body: string
}

export interface SmsLog {
  id: string
  to: string
  templateId: string
  body: string
  status: 'simulated'
  createdAt: string
  bookingId?: string
}

export interface PartnerApplication {
  id: string
  fullName: string
  phone: string
  email: string
  address: string
  vehicleDetails: string
  ownershipType: OwnershipType
  vehicleCount: number
  notes: string
  status: ApplicationStatus
  shareRate?: number
  reviewNote?: string
  createdAt: string
  reviewedAt?: string
}

export interface Inquiry {
  id: string
  name: string
  email: string
  phone: string
  message: string
  vehicleId?: string
  createdAt: string
}

export interface Settings {
  holdPendingBookings: boolean
  companyCommissionRate: number
  defaultPartnerShare: number
  ownersCanBlockAvailability: boolean
  smsSenderName: string
  locations: string[]
}

export interface DemoData {
  users: User[]
  vehicles: Vehicle[]
  bookings: Booking[]
  payments: Payment[]
  maintenance: MaintenanceWindow[]
  favorites: Favorite[]
  notifications: AppNotification[]
  smsTemplates: SmsTemplate[]
  smsLogs: SmsLog[]
  applications: PartnerApplication[]
  inquiries: Inquiry[]
  reviews: Review[]
  settings: Settings
  sessionUserId: string | null
  bookingSeq: number
  version: number
}

export interface CustomerDraft {
  name: string
  email: string
  phone: string
  address: string
  licenseNumber?: string
  emergencyName?: string
  emergencyPhone?: string
}

export interface CreateBookingInput {
  vehicleId: string
  customerId?: string
  customer?: CustomerDraft
  pickupLocation: string
  pickupDate: string
  returnDate: string
  pickupTime: string
  returnTime: string
  rentalType: RentalType
  addons: BookingAddons
  specialRequest: string
  documentName?: string
  actorId: string | null
}

export interface VehicleInput {
  name: string
  brand: string
  model: string
  year: number
  category: VehicleCategory
  seats: number
  transmission: Transmission
  fuel: FuelType
  pricePerDay: number
  listingStatus: ListingStatus
  listingActive: boolean
  ownerId: string | null
  partnerId: string | null
  images: string[]
  description: string
  features: string[]
  inclusions: string[]
  plateNumber: string
  offeredRentalTypes: RentalType[]
  airconditioning: boolean
}

export interface PaymentInput {
  bookingId: string
  amount: number
  method: PaymentMethod
  note: string
  reference: string
  markVerified: boolean
  actorId: string
}

export interface MaintenanceInput {
  vehicleId: string
  startDate: string
  endDate: string
  reason: string
  actorId: string
}

export interface ApplicationInput {
  fullName: string
  phone: string
  email: string
  address: string
  vehicleDetails: string
  ownershipType: OwnershipType
  vehicleCount: number
  notes: string
}

export interface InquiryInput {
  name: string
  email: string
  phone: string
  message: string
  vehicleId?: string
}

export interface UserInput {
  role: Extract<Role, 'owner' | 'partner' | 'customer'>
  name: string
  email: string
  phone: string
  address: string
  shareRate?: number
  notes?: string
}

export interface SmsInput {
  to: string
  templateId: string
  body: string
  bookingId?: string
  actorId: string
}
