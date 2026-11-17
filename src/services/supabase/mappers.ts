import type {
  Booking,
  BookingAddons,
  BookingHistoryEntry,
  MaintenanceWindow,
  PartnerApplication,
  Payment,
  User,
  Vehicle,
} from '@/types'

type ProfileRow = {
  id: string
  role: User['role']
  full_name: string
  email: string
  phone: string
  address: string
  title: string
  status: User['status']
  license_number: string | null
  emergency_name: string | null
  emergency_phone: string | null
  notes: string | null
  created_at: string
  partner_profiles?:
    | {
        share_rate_bps: number
        business_name?: string
        vehicle_count?: number
        ownership_type?: import('@/types').OwnershipType
        vehicle_summary?: string
        contract_reference?: string
        contract_notes?: string
        contact_person?: string
        agreement_signed_at?: string | null
        rate_first_day_centavos?: number | null
        rate_succeeding_day_centavos?: number | null
        rate_10_days_centavos?: number | null
        rate_15_plus_centavos?: number | null
        share_first_day_centavos?: number | null
        share_succeeding_day_centavos?: number | null
        share_10_days_centavos?: number | null
        share_15_plus_centavos?: number | null
      }[]
    | {
        share_rate_bps: number
        business_name?: string
        vehicle_count?: number
        ownership_type?: import('@/types').OwnershipType
        vehicle_summary?: string
        contract_reference?: string
        contract_notes?: string
        contact_person?: string
        agreement_signed_at?: string | null
        rate_first_day_centavos?: number | null
        rate_succeeding_day_centavos?: number | null
        rate_10_days_centavos?: number | null
        rate_15_plus_centavos?: number | null
        share_first_day_centavos?: number | null
        share_succeeding_day_centavos?: number | null
        share_10_days_centavos?: number | null
        share_15_plus_centavos?: number | null
      }
    | null
}

type VehicleRow = {
  id: string
  name: string
  brand: string
  model: string
  year: number
  category: Vehicle['category']
  seats: number
  transmission: Vehicle['transmission']
  fuel: Vehicle['fuel']
  price_per_day_centavos: number
  rate_first_day_centavos?: number | null
  rate_succeeding_day_centavos?: number | null
  rate_10_days_centavos?: number | null
  rate_15_plus_centavos?: number | null
  listing_status: Vehicle['listingStatus']
  listing_active: boolean
  owner_id: string | null
  partner_id: string | null
  description: string
  features: string[]
  inclusions: string[]
  plate_number: string
  offered_rental_types: Vehicle['offeredRentalTypes']
  airconditioning: boolean
  created_at: string
  promo_video_path?: string | null
  vehicle_images?: { storage_path: string; sort_order: number; is_primary: boolean }[]
}

type BookingRow = {
  id: string
  reference: string
  vehicle_id: string
  customer_id: string
  pickup_location: string
  pickup_date: string
  return_date: string
  pickup_time: string
  return_time: string
  rental_type: Booking['rentalType']
  addon_insurance: boolean
  addon_with_driver: boolean
  addon_child_seat: boolean
  special_request: string
  document_storage_path: string | null
  contract_storage_path: string | null
  contract_signed_at: string | null
  contract_signer_name: string | null
  status: Booking['status']
  payment_status: Booking['paymentStatus']
  price_days: number
  price_daily_rate_centavos: number
  price_base_centavos: number
  price_insurance_centavos: number
  price_driver_centavos: number
  price_child_seat_centavos: number
  price_total_centavos: number
  admin_notes: string
  created_at: string
}

type BlockRow = {
  id: string
  vehicle_id: string
  start_date: string
  end_date: string
  reason: string
  created_by: string | null
}

type HistoryRow = {
  booking_id: string
  previous_status: Booking['status'] | null
  new_status: Booking['status']
  reason: string | null
  created_at: string
  acted_by: string | null
  profiles?: { full_name: string } | { full_name: string }[] | null
}

const centavosToPeso = (c: number) => c / 100

function mapVehicleRentalPackage(row: VehicleRow) {
  if (row.rate_first_day_centavos == null) return undefined
  const first = row.rate_first_day_centavos
  return {
    rateFirstDay: centavosToPeso(first),
    rateSucceeding: centavosToPeso(row.rate_succeeding_day_centavos ?? first),
    rate10Days: centavosToPeso(row.rate_10_days_centavos ?? first),
    rate15Plus: centavosToPeso(row.rate_15_plus_centavos ?? first),
  }
}

type PartnerRateRow = {
  rate_first_day_centavos?: number | null
  rate_succeeding_day_centavos?: number | null
  rate_10_days_centavos?: number | null
  rate_15_plus_centavos?: number | null
}

function mapPartnerRentalPackage(partner?: PartnerRateRow | null) {
  if (!partner || partner.rate_first_day_centavos == null) return undefined
  const first = partner.rate_first_day_centavos
  return {
    rateFirstDay: centavosToPeso(first),
    rateSucceeding: centavosToPeso(partner.rate_succeeding_day_centavos ?? first),
    rate10Days: centavosToPeso(partner.rate_10_days_centavos ?? first),
    rate15Plus: centavosToPeso(partner.rate_15_plus_centavos ?? first),
  }
}

type PartnerShareRow = {
  share_first_day_centavos?: number | null
  share_succeeding_day_centavos?: number | null
  share_10_days_centavos?: number | null
  share_15_plus_centavos?: number | null
}

function mapPartnerFixedShare(partner?: PartnerShareRow | null) {
  if (!partner || partner.share_first_day_centavos == null) return undefined
  const first = partner.share_first_day_centavos
  return {
    rateFirstDay: centavosToPeso(first),
    rateSucceeding: centavosToPeso(partner.share_succeeding_day_centavos ?? first),
    rate10Days: centavosToPeso(partner.share_10_days_centavos ?? first),
    rate15Plus: centavosToPeso(partner.share_15_plus_centavos ?? first),
  }
}

export function mapProfile(row: ProfileRow): User {
  const partner = Array.isArray(row.partner_profiles)
    ? row.partner_profiles[0]
    : row.partner_profiles ?? undefined
  return {
    id: row.id,
    role: row.role,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    title: row.title,
    status: row.status,
    shareRate: partner?.share_rate_bps != null ? partner.share_rate_bps / 100 : undefined,
    partnerProfile: partner
      ? {
          businessName: partner.business_name ?? '',
          vehicleCount: partner.vehicle_count ?? 0,
          ownershipType: partner.ownership_type ?? 'owned',
          vehicleSummary: partner.vehicle_summary ?? '',
          contractReference: partner.contract_reference ?? '',
          contractNotes: partner.contract_notes ?? '',
          contactPerson: partner.contact_person ?? '',
          agreementSignedAt: partner.agreement_signed_at ?? undefined,
          rentalPackage: mapPartnerRentalPackage(partner),
          fixedShare: mapPartnerFixedShare(partner),
        }
      : undefined,
    licenseNumber: row.license_number ?? undefined,
    emergencyName: row.emergency_name ?? undefined,
    emergencyPhone: row.emergency_phone ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

export function mapVehicle(row: VehicleRow): Vehicle {
  const images = [...(row.vehicle_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => image.storage_path)
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    model: row.model,
    year: row.year,
    category: row.category,
    seats: row.seats,
    transmission: row.transmission,
    fuel: row.fuel,
    pricePerDay: centavosToPeso(row.price_per_day_centavos),
    rentalPackage: mapVehicleRentalPackage(row),
    listingStatus: row.listing_status,
    listingActive: row.listing_active,
    ownerId: row.owner_id,
    partnerId: row.partner_id,
    images: images.length ? images : ['/vehicles/fortuner.jpg'],
    promoVideo: row.promo_video_path ?? undefined,
    description: row.description,
    features: Array.isArray(row.features) ? row.features : [],
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
    plateNumber: row.plate_number,
    offeredRentalTypes: row.offered_rental_types?.length ? row.offered_rental_types : ['self-drive', 'with-driver'],
    airconditioning: row.airconditioning,
    createdAt: row.created_at,
  }
}

function mapAddons(row: BookingRow): BookingAddons {
  return {
    insurance: row.addon_insurance,
    withDriver: row.addon_with_driver,
    childSeat: row.addon_child_seat,
  }
}

function historyLabel(row: HistoryRow): string {
  if (!row.previous_status) return `Status set to ${row.new_status}`
  return `${row.previous_status} → ${row.new_status}`
}

function actorLabel(row: HistoryRow): string {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return profile?.full_name ?? 'System'
}

export function mapBooking(row: BookingRow, historyRows: HistoryRow[]): Booking {
  const history: BookingHistoryEntry[] = historyRows
    .filter((item) => item.booking_id === row.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((item, index) => ({
      id: `hist-${row.id}-${index}`,
      at: item.created_at,
      action: historyLabel(item),
      by: actorLabel(item),
    }))

  const days = row.price_days
  const dailyRate = centavosToPeso(row.price_daily_rate_centavos)

  return {
    id: row.id,
    reference: row.reference,
    vehicleId: row.vehicle_id,
    customerId: row.customer_id,
    pickupLocation: row.pickup_location,
    pickupDate: row.pickup_date,
    returnDate: row.return_date,
    pickupTime: String(row.pickup_time).slice(0, 5),
    returnTime: String(row.return_time).slice(0, 5),
    rentalType: row.rental_type,
    addons: mapAddons(row),
    specialRequest: row.special_request,
    documentName: row.document_storage_path ?? undefined,
    contractStoragePath: row.contract_storage_path ?? undefined,
    contractSignedAt: row.contract_signed_at ?? undefined,
    contractSignerName: row.contract_signer_name ?? undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    pricing: {
      days,
      dailyRate,
      base: centavosToPeso(row.price_base_centavos),
      insurance: centavosToPeso(row.price_insurance_centavos),
      driver: centavosToPeso(row.price_driver_centavos),
      childSeat: centavosToPeso(row.price_child_seat_centavos),
      securityDeposit: 3000,
      total: centavosToPeso(row.price_total_centavos),
    },
    notes: row.admin_notes,
    history,
    createdAt: row.created_at,
  }
}

export function mapMaintenance(row: BlockRow): MaintenanceWindow {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason || 'Blocked',
    createdBy: row.created_by ?? '',
  }
}

export function mapPayment(row: {
  id: string
  booking_id: string
  amount_centavos: number
  method: Payment['method']
  status: Payment['status']
  reference: string
  note: string
  recorded_by: string | null
  created_at: string
}): Payment {
  return {
    id: row.id,
    bookingId: row.booking_id,
    amount: centavosToPeso(row.amount_centavos),
    method: row.method,
    status: row.status,
    reference: row.reference,
    note: row.note,
    recordedBy: row.recorded_by ?? '',
    createdAt: row.created_at,
  }
}

export function mapApplication(row: {
  id: string
  full_name: string
  phone: string
  email: string
  address: string
  vehicle_details: string
  ownership_type: PartnerApplication['ownershipType']
  vehicle_count: number
  notes: string
  status: PartnerApplication['status']
  share_rate_bps: number | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
}): PartnerApplication {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    vehicleDetails: row.vehicle_details,
    ownershipType: row.ownership_type,
    vehicleCount: row.vehicle_count,
    notes: row.notes,
    status: row.status,
    shareRate: row.share_rate_bps != null ? row.share_rate_bps / 100 : undefined,
    reviewNote: row.review_note ?? undefined,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? undefined,
  }
}

export function vehicleToInsert(input: import('@/types').VehicleInput, actorId: string, actorRole: User['role']) {
  const patch = {
    name: input.name,
    brand: input.brand,
    model: input.model,
    year: input.year,
    category: input.category,
    seats: input.seats,
    transmission: input.transmission,
    fuel: input.fuel,
    price_per_day_centavos: Math.round((input.rentalPackage?.rateFirstDay ?? input.pricePerDay) * 100),
    rate_first_day_centavos:
      input.rentalPackage != null ? Math.round(input.rentalPackage.rateFirstDay * 100) : null,
    rate_succeeding_day_centavos:
      input.rentalPackage != null ? Math.round(input.rentalPackage.rateSucceeding * 100) : null,
    rate_10_days_centavos: input.rentalPackage != null ? Math.round(input.rentalPackage.rate10Days * 100) : null,
    rate_15_plus_centavos: input.rentalPackage != null ? Math.round(input.rentalPackage.rate15Plus * 100) : null,
    listing_status: input.listingStatus,
    listing_active: input.listingActive,
    owner_id: input.ownerId,
    partner_id: input.partnerId,
    description: input.description,
    features: input.features,
    inclusions: input.inclusions,
    plate_number: input.plateNumber,
    offered_rental_types: input.offeredRentalTypes,
    airconditioning: input.airconditioning,
    promo_video_path: input.promoVideo ?? null,
  }
  if (actorRole === 'partner') {
    return {
      ...patch,
      partner_id: actorId,
      listing_status: 'pending' as const,
      listing_active: false,
    }
  }
  return patch
}