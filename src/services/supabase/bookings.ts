import { getSupabaseClient } from '@/lib/supabase/client'
import { resolveBookingCustomerId } from '@/services/supabase/bookingCustomer'
import { fetchSupabaseSnapshot } from '@/services/supabase/snapshot'
import { mapBooking, mapVehicle } from '@/services/supabase/mappers'
import type { Booking, BookingStatus, CreateBookingInput } from '@/types'
import { enqueueBookingStatusEmails } from '@/services/notifications/outbox'
import { canTransition, scheduleIssues } from '@/utils/bookingRules'
import { persistBookingContract } from '@/services/bookingContract'
import { quotePackage } from '@/utils/pricing'
import { resolveRentalPackage } from '@/utils/rentalPackage'
import { isUuid, resolveVehicleForBooking } from '@/utils/vehicleParam'

const vehicleLookupColumns = `id, name, brand, model, year, category, seats, transmission, fuel,
  price_per_day_centavos, listing_status, listing_active, owner_id, partner_id,
  description, features, inclusions, plate_number, offered_rental_types, airconditioning, created_at`

async function resolveFleetVehicle(
  supabase: ReturnType<typeof getSupabaseClient>,
  snapVehicles: Awaited<ReturnType<typeof fetchSupabaseSnapshot>>['vehicles'],
  param: string,
) {
  try {
    const vehicle = resolveVehicleForBooking(snapVehicles, param)
    if (isUuid(vehicle.id)) return vehicle
  } catch {
    // Snapshot may have legacy slug ids — resolve from database.
  }

  const trimmed = param.trim()
  if (isUuid(trimmed)) {
    const { data, error } = await supabase
      .from('vehicles')
      .select(vehicleLookupColumns)
      .eq('id', trimmed)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return mapVehicle(data as Parameters<typeof mapVehicle>[0])
  }

  const { data, error } = await supabase.from('vehicles').select(vehicleLookupColumns).is('deleted_at', null)
  if (error) throw new Error(error.message)
  const fleet = (data ?? []).map((row) => mapVehicle(row as Parameters<typeof mapVehicle>[0]))
  const vehicle = resolveVehicleForBooking(fleet, trimmed)
  if (!isUuid(vehicle.id)) {
    throw new Error('This vehicle could not be matched in the fleet. Open it from Available Cars and book again.')
  }
  return vehicle
}

function normalizeTime(value: string | null | undefined) {
  if (value == null) return ''
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

async function findPendingBookingInDatabase(
  supabase: ReturnType<typeof getSupabaseClient>,
  customerId: string,
  vehicleId: string,
  input: Pick<CreateBookingInput, 'pickupDate' | 'returnDate' | 'pickupTime' | 'returnTime'>,
): Promise<Booking | null> {
  const { data: rows, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .eq('vehicle_id', vehicleId)
    .eq('status', 'pending')
    .eq('pickup_date', input.pickupDate)
    .eq('return_date', input.returnDate)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  if (!rows?.length) return null

  const pickup = normalizeTime(input.pickupTime)
  const ret = normalizeTime(input.returnTime)
  const exact =
    rows.find(
      (row) => normalizeTime(row.pickup_time) === pickup && normalizeTime(row.return_time) === ret,
    ) ?? rows[0]

  if (!exact?.id || !isUuid(exact.id)) return null
  return mapBooking(exact as Parameters<typeof mapBooking>[0], [])
}

async function attachBookingContract(
  supabase: ReturnType<typeof getSupabaseClient>,
  row: { id: string; reference: string; customer_id?: string },
  contract: NonNullable<CreateBookingInput['contract']>,
) {
  const { data: sessionData } = await supabase.auth.getSession()
  const authUserId = sessionData.session?.user?.id
  if (!authUserId) {
    throw new Error('You must be signed in to save your signed contract. Sign in and confirm again.')
  }

  const { data: fresh, error: loadError } = await supabase
    .from('bookings')
    .select('id, reference, customer_id')
    .eq('reference', row.reference)
    .maybeSingle()
  if (loadError) throw new Error(loadError.message)

  const bookingCustomerId = (fresh?.customer_id ?? row.customer_id) as string | undefined
  if (bookingCustomerId && bookingCustomerId !== authUserId) {
    throw new Error('This booking belongs to another account. Sign in with the correct customer account.')
  }

  const bookingKey = fresh?.id && isUuid(fresh.id) ? fresh.id : row.id
  const reference = fresh?.reference ?? row.reference
  if (!isUuid(bookingKey)) {
    throw new Error('Could not verify this booking. Refresh the page and confirm again.')
  }

  const saved = await persistBookingContract(bookingKey, reference, contract)
  const { error: contractError } = await supabase
    .from('bookings')
    .update({
      contract_storage_path: saved.contractStoragePath,
      contract_signed_at: saved.contractSignedAt,
      contract_signer_name: saved.contractSignerName,
    })
    .eq('id', bookingKey)
  if (contractError) throw new Error(contractError.message)

  return {
    contract_storage_path: saved.contractStoragePath,
    contract_signed_at: saved.contractSignedAt,
    contract_signer_name: saved.contractSignerName,
    id: bookingKey,
  }
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const customerId = await resolveBookingCustomerId(input.customerId, input.customer)

  const snap = await fetchSupabaseSnapshot()
  const supabase = getSupabaseClient()
  const vehicle = await resolveFleetVehicle(supabase, snap.vehicles, input.vehicleId)
  const vehicleId = vehicle.id

  const existingPending = await findPendingBookingInDatabase(supabase, customerId, vehicleId, input)

  const issues = scheduleIssues(
    {
      vehicleId,
      pickupDate: input.pickupDate,
      returnDate: input.returnDate,
      pickupTime: input.pickupTime,
      returnTime: input.returnTime,
      rentalType: input.rentalType,
      customerId,
      ignoreBookingId: existingPending?.id,
    },
    snap,
  )
  if (issues.length) throw new Error(issues[0])

  const pkg = resolveRentalPackage(vehicle, snap.settings)
  const pricing = quotePackage(
    pkg,
    input.pickupDate,
    input.returnDate,
    input.rentalType,
    input.addons,
    input.driverZone,
    snap.settings.defaultDriverPackage,
    snap.settings.securityDepositAmount,
  )

  if (existingPending) {
    return resumePendingBooking(supabase, existingPending, input, pricing, snap)
  }

  const { data: reference, error: refError } = await supabase.rpc('next_booking_reference')
  if (refError) throw new Error(refError.message)
  if (!reference) throw new Error('Could not generate booking reference.')

  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      reference,
      vehicle_id: vehicleId,
      customer_id: customerId,
      pickup_location: input.pickupLocation,
      pickup_date: input.pickupDate,
      return_date: input.returnDate,
      pickup_time: input.pickupTime,
      return_time: input.returnTime,
      rental_type: input.rentalType,
      addon_insurance: input.addons.insurance,
      addon_with_driver: input.addons.withDriver,
      addon_child_seat: input.addons.childSeat,
      special_request: input.specialRequest,
      document_storage_path: input.documentName || null,
      status: 'pending',
      payment_status: 'unpaid',
      price_days: pricing.days,
      price_daily_rate_centavos: Math.round(pricing.dailyRate * 100),
      price_base_centavos: Math.round(pricing.base * 100),
      price_insurance_centavos: Math.round(pricing.insurance * 100),
      price_driver_centavos: Math.round(pricing.driver * 100),
      price_child_seat_centavos: Math.round(pricing.childSeat * 100),
      price_total_centavos: Math.round(pricing.total * 100),
    })
    .select('*')
    .single()

  if (error) {
    if (error.message.includes('bookings_no_overlap') || error.code === '23P01') {
      throw new Error('Those dates overlap an existing reservation for this vehicle.')
    }
    throw new Error(error.message)
  }

  if (input.contract) {
    const contractMeta = await attachBookingContract(supabase, row, input.contract)
    row.id = contractMeta.id
    row.contract_storage_path = contractMeta.contract_storage_path
    row.contract_signed_at = contractMeta.contract_signed_at
    row.contract_signer_name = contractMeta.contract_signer_name
  }

  return mapBooking(row as Parameters<typeof mapBooking>[0], [
    {
      booking_id: row.id,
      previous_status: null,
      new_status: 'pending',
      reason: null,
      created_at: row.created_at,
      acted_by: customerId,
      profiles: { full_name: input.customer?.name ?? 'Customer' },
    },
  ])
}

async function resumePendingBooking(
  supabase: ReturnType<typeof getSupabaseClient>,
  existing: Booking,
  input: CreateBookingInput,
  pricing: Booking['pricing'],
  snap: Awaited<ReturnType<typeof fetchSupabaseSnapshot>>,
): Promise<Booking> {
  if (!isUuid(existing.id)) {
    throw new Error('Could not resume this booking. Refresh the page and confirm again.')
  }

  const { data: row, error } = await supabase
    .from('bookings')
    .update({
      pickup_location: input.pickupLocation,
      rental_type: input.rentalType,
      addon_insurance: input.addons.insurance,
      addon_with_driver: input.addons.withDriver,
      addon_child_seat: input.addons.childSeat,
      special_request: input.specialRequest,
      document_storage_path: input.documentName || null,
      price_days: pricing.days,
      price_daily_rate_centavos: Math.round(pricing.dailyRate * 100),
      price_base_centavos: Math.round(pricing.base * 100),
      price_insurance_centavos: Math.round(pricing.insurance * 100),
      price_driver_centavos: Math.round(pricing.driver * 100),
      price_child_seat_centavos: Math.round(pricing.childSeat * 100),
      price_total_centavos: Math.round(pricing.total * 100),
    })
    .eq('id', existing.id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  if (!row?.id || !isUuid(row.id)) {
    throw new Error('Could not update your pending booking. Refresh and try again.')
  }

  if (input.contract) {
    const contractMeta = await attachBookingContract(supabase, row, input.contract)
    row.id = contractMeta.id
    row.contract_storage_path = contractMeta.contract_storage_path
    row.contract_signed_at = contractMeta.contract_signed_at
    row.contract_signer_name = contractMeta.contract_signer_name
  }

  const prior = snap.bookings.find((item) => item.id === row.id)
  const booking = mapBooking(row as Parameters<typeof mapBooking>[0], [])
  if (prior?.history.length) booking.history = prior.history
  return booking
}

export async function transitionBooking(
  id: string,
  status: BookingStatus,
  _actorId: string,
  note?: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { data: current, error: loadError } = await supabase.from('bookings').select('status').eq('id', id).maybeSingle()
  if (loadError) throw new Error(loadError.message)
  if (!current) throw new Error('Booking not found.')
  const from = current.status as BookingStatus
  if (!canTransition(from, status)) throw new Error(`Cannot move from ${from} to ${status}.`)
  const { error } = await supabase
    .from('bookings')
    .update({
      status,
      admin_notes: note ? note : undefined,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  const { data: booking } = await supabase
    .from('bookings')
    .select('reference, customer_id, profiles:customer_id ( email )')
    .eq('id', id)
    .maybeSingle()
  if (booking) {
    const email = (booking as { profiles?: { email?: string } }).profiles?.email
    void enqueueBookingStatusEmails({
      id,
      reference: booking.reference as string,
      status,
      customerId: booking.customer_id as string,
      customerEmail: email,
    })
  }
}

export async function updateBookingNotes(id: string, patch: Partial<Pick<Booking, 'pickupLocation' | 'notes'>>) {
  const supabase = getSupabaseClient()
  const update: Record<string, string> = {}
  if (patch.pickupLocation != null) update.pickup_location = patch.pickupLocation
  if (patch.notes != null) update.admin_notes = patch.notes
  if (Object.keys(update).length === 0) return
  const { error } = await supabase.from('bookings').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}