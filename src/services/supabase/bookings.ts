import { getSupabaseClient } from '@/lib/supabase/client'
import { resolveBookingCustomerId, type BookingCustomerResolution } from '@/services/supabase/bookingCustomer'
import { signOut } from '@/services/auth/authService'
import { sendGuestBookingSupabaseEmail } from '@/services/notifications/guestBookingEmail'
import { fetchSupabaseSnapshot } from '@/services/supabase/snapshot'
import { mapBooking, mapVehicle } from '@/services/supabase/mappers'
import type { Booking, BookingStatus, CreateBookingInput } from '@/types'
import { enqueueBookingStatusEmails } from '@/services/notifications/outbox'
import { canTransition, findMatchingPendingBooking, scheduleIssues } from '@/utils/bookingRules'
import { persistRenterDocuments } from '@/services/bookingDocuments'
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

function isStorageAlreadyStored(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('already exists') ||
    lower.includes('resource already exists') ||
    (lower.includes('duplicate') && lower.includes('object'))
  )
}

function isRenterDocColumnMissing(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('valid_id_storage_path') ||
    lower.includes('proof_of_billing_storage_path') ||
    (lower.includes('column') && lower.includes('does not exist'))
  )
}

function isContractColumnMissing(message: string) {
  const lower = message.toLowerCase()
  return (
    (lower.includes('contract_storage_path') ||
      lower.includes('contract_signed_at') ||
      lower.includes('contract_signer_name')) &&
    lower.includes('column')
  )
}

/** Booking row already saved — docs/contract/refresh must not block success for the customer. */
function isNonFatalPostInsertError(message: string) {
  if (isStorageAlreadyStored(message) || isRenterDocColumnMissing(message) || isContractColumnMissing(message)) {
    return true
  }
  const lower = message.toLowerCase()
  return (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('42501') ||
    lower.includes('violates row-level security')
  )
}

async function reloadBookingRow(
  supabase: ReturnType<typeof getSupabaseClient>,
  bookingId: string,
  fallback: Record<string, unknown>,
) {
  const { data } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle()
  return (data ?? fallback) as Parameters<typeof mapBooking>[0]
}

async function finalizeGuestCheckout(
  resolution: BookingCustomerResolution,
  booking: Booking,
  customerEmail?: string,
): Promise<Booking> {
  await enqueueBookingStatusEmails({
    id: booking.id,
    reference: booking.reference,
    status: 'pending',
    customerId: booking.customerId,
    customerEmail: customerEmail?.trim() || resolution.guestCredentials?.email,
  })

  if (resolution.mode !== 'new_guest' || !resolution.guestCredentials) {
    return booking
  }

  const loginEmailSent = await sendGuestBookingSupabaseEmail(
    resolution.guestCredentials.email,
    booking.reference,
  )

  await signOut()

  return {
    ...booking,
    checkout: {
      guestLoginEmailSent: loginEmailSent,
      guestEmail: resolution.guestCredentials.email,
    },
  }
}

async function attachPostInsertExtras(
  supabase: ReturnType<typeof getSupabaseClient>,
  row: { id: string; reference: string; customer_id?: string },
  input: CreateBookingInput,
) {
  try {
    await attachRenterDocuments(supabase, row.id, input)
  } catch (attachError) {
    const message = attachError instanceof Error ? attachError.message : ''
    if (!isNonFatalPostInsertError(message)) throw attachError
  }

  if (!input.contract) return

  try {
    const contractMeta = await attachBookingContract(supabase, row, input.contract)
    Object.assign(row, {
      id: contractMeta.id,
      contract_storage_path: contractMeta.contract_storage_path,
      contract_signed_at: contractMeta.contract_signed_at,
      contract_signer_name: contractMeta.contract_signer_name,
    })
  } catch (attachError) {
    const message = attachError instanceof Error ? attachError.message : ''
    if (!isNonFatalPostInsertError(message)) throw attachError
  }
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

async function findLatestCustomerPendingOnVehicle(
  supabase: ReturnType<typeof getSupabaseClient>,
  customerId: string,
  vehicleId: string,
): Promise<Booking | null> {
  const { data: rows, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .eq('vehicle_id', vehicleId)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  const row = rows?.[0]
  if (!row?.id || !isUuid(row.id)) return null
  return mapBooking(row as Parameters<typeof mapBooking>[0], [])
}

async function attachRenterDocuments(
  supabase: ReturnType<typeof getSupabaseClient>,
  bookingId: string,
  input: CreateBookingInput,
) {
  if (!input.renterDocuments) return
  const paths = await persistRenterDocuments(bookingId, input.renterDocuments)
  if (!paths.license && !paths.validId && !paths.proofOfBilling) return

  const fullPatch = {
    document_storage_path: paths.license ?? input.documentName ?? null,
    valid_id_storage_path: paths.validId ?? null,
    proof_of_billing_storage_path: paths.proofOfBilling ?? null,
  }
  const { error } = await supabase.from('bookings').update(fullPatch).eq('id', bookingId)
  if (!error) return

  if (isRenterDocColumnMissing(error.message)) {
    const legacy = { document_storage_path: paths.license ?? input.documentName ?? null }
    const { error: legacyError } = await supabase.from('bookings').update(legacy).eq('id', bookingId)
    if (legacyError) throw new Error(legacyError.message)
    return
  }
  throw new Error(error.message)
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
  const resolution = await resolveBookingCustomerId(input.customerId, input.customer)
  const customerId = resolution.customerId

  const snap = await fetchSupabaseSnapshot()
  const supabase = getSupabaseClient()
  const vehicle = await resolveFleetVehicle(supabase, snap.vehicles, input.vehicleId)
  const vehicleId = vehicle.id

  let existingPending = await findPendingBookingInDatabase(supabase, customerId, vehicleId, input)
  if (!existingPending) {
    const fromSnapshot = findMatchingPendingBooking(snap.bookings, customerId, {
      vehicleId,
      pickupDate: input.pickupDate,
      returnDate: input.returnDate,
      pickupTime: input.pickupTime,
      returnTime: input.returnTime,
    })
    if (fromSnapshot && isUuid(fromSnapshot.id)) {
      existingPending = fromSnapshot
    } else {
      const loose = await findLatestCustomerPendingOnVehicle(supabase, customerId, vehicleId)
      if (
        loose &&
        loose.pickupDate === input.pickupDate &&
        loose.returnDate === input.returnDate
      ) {
        existingPending = loose
      }
    }
  }

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
    const resumed = await resumePendingBooking(supabase, existingPending, input, pricing, snap)
    return finalizeGuestCheckout(resolution, resumed, input.customer?.email)
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
      document_storage_path: null,
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
    const overlap =
      error.code === '23P01' ||
      /bookings_no_overlap|exclusion constraint|conflicting key/i.test(error.message)
    if (overlap) {
      const sameCustomer = await findLatestCustomerPendingOnVehicle(supabase, customerId, vehicleId)
      if (sameCustomer) {
        const resumed = await resumePendingBooking(supabase, sameCustomer, input, pricing, snap)
        return finalizeGuestCheckout(resolution, resumed, input.customer?.email)
      }
      throw new Error('Those dates are no longer available for this vehicle. Pick different dates and try again.')
    }
    if (/row-level security|permission denied|42501/i.test(error.message)) {
      throw new Error('This account cannot finish an online booking. Sign out and book as a customer, or contact Drive Moko for help.')
    }
    throw new Error(error.message)
  }

  await attachPostInsertExtras(supabase, row, input)
  const bookingRow = await reloadBookingRow(supabase, row.id, row)

  const booking = mapBooking(bookingRow, [
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
  return finalizeGuestCheckout(resolution, booking, input.customer?.email)
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

  await attachPostInsertExtras(supabase, row, input)
  const bookingRow = await reloadBookingRow(supabase, row.id, row)

  const prior = snap.bookings.find((item) => item.id === row.id)
  const booking = mapBooking(bookingRow, [])
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