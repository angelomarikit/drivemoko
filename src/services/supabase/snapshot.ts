import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuthSessionStore } from '@/stores/authSessionStore'
import type { DemoData } from '@/types'
import { emptySnapshotTail, DEFAULT_SETTINGS } from '@/services/supabase/defaults'
import { listPartnerDisbursements } from '@/services/supabase/partnerDisbursements'
import { mapApplication, mapBooking, mapMaintenance, mapPayment, mapProfile, mapVehicle } from '@/services/supabase/mappers'

const profileColumns = `id, role, full_name, email, phone, address, title, status,
        license_number, emergency_name, emergency_phone, notes, created_at`

const partnerProfilesMinimal = `partner_profiles ( share_rate_bps )`
const partnerProfilesExtended = `partner_profiles (
          share_rate_bps, business_name, vehicle_count, ownership_type,
          vehicle_summary, contract_reference, contract_notes, contact_person, agreement_signed_at,
          rate_first_day_centavos, rate_succeeding_day_centavos, rate_10_days_centavos, rate_15_plus_centavos,
          share_first_day_centavos, share_succeeding_day_centavos, share_10_days_centavos, share_15_plus_centavos
        )`

function profileSelectNeedsFallback(error: { message?: string; code?: string }) {
  const message = (error.message ?? '').toLowerCase()
  return (
    message.includes('column') ||
    message.includes('partner_profiles') ||
    error.code === '42703' ||
    error.code === 'PGRST204'
  )
}

const vehicleColumns = `id, name, brand, model, year, category, seats, transmission, fuel,
        description, features, inclusions, plate_number, offered_rental_types, airconditioning,
        created_at, vehicle_images ( storage_path, sort_order, is_primary )`

const vehicleRates = `price_per_day_centavos, rate_first_day_centavos, rate_succeeding_day_centavos,
        rate_10_days_centavos, rate_15_plus_centavos, promo_video_path,
        listing_status, listing_active, owner_id, partner_id`

async function fetchVehiclesSnapshot(supabase: ReturnType<typeof getSupabaseClient>) {
  const extended = await supabase
    .from('vehicles')
    .select(`${vehicleColumns}, ${vehicleRates}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (!extended.error) return extended
  if (!profileSelectNeedsFallback(extended.error)) return extended
  return supabase
    .from('vehicles')
    .select(`${vehicleColumns}, price_per_day_centavos, listing_status, listing_active, owner_id, partner_id`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
}

async function fetchProfilesSnapshot(supabase: ReturnType<typeof getSupabaseClient>) {
  const extended = await supabase.from('profiles').select(`${profileColumns}, ${partnerProfilesExtended}`)
  if (!extended.error) return extended
  if (!profileSelectNeedsFallback(extended.error)) return extended
  return supabase.from('profiles').select(`${profileColumns}, ${partnerProfilesMinimal}`)
}

export async function fetchSupabaseSnapshot(): Promise<DemoData> {
  const supabase = getSupabaseClient()
  const sessionUserId = useAuthSessionStore.getState().user?.id ?? null

  const profilesPromise = fetchProfilesSnapshot(supabase)
  const vehiclesPromise = fetchVehiclesSnapshot(supabase)

  const [
    profilesRes,
    vehiclesRes,
    bookingsRes,
    historyRes,
    blocksRes,
    settingsRes,
    notificationsRes,
    paymentsRes,
    applicationsRes,
    favoritesRes,
    inquiriesRes,
  ] = await Promise.all([
    profilesPromise,
    vehiclesPromise,
    supabase.from('bookings').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase
      .from('booking_status_history')
      .select('booking_id, previous_status, new_status, reason, created_at, acted_by, profiles:acted_by ( full_name )')
      .order('created_at', { ascending: true }),
    supabase.from('vehicle_availability_blocks').select('*').order('start_date', { ascending: true }),
    supabase.from('system_settings').select('*').maybeSingle(),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    supabase.from('partner_applications').select('*').order('created_at', { ascending: false }),
    supabase.from('customer_favorites').select('user_id, vehicle_id'),
    supabase.from('support_inquiries').select('*').order('created_at', { ascending: false }).limit(100),
  ])

  if (profilesRes.error) throw new Error(profilesRes.error.message)
  if (vehiclesRes.error) throw new Error(vehiclesRes.error.message)
  if (bookingsRes.error) throw new Error(bookingsRes.error.message)

  const users = (profilesRes.data ?? []).map((row) => mapProfile(row as Parameters<typeof mapProfile>[0]))
  const vehicles = (vehiclesRes.data ?? []).map((row) => mapVehicle(row as Parameters<typeof mapVehicle>[0]))
  const historyRows = historyRes.error ? [] : historyRes.data ?? []
  const bookings = (bookingsRes.data ?? []).map((row) =>
    mapBooking(row as Parameters<typeof mapBooking>[0], historyRows as Parameters<typeof mapBooking>[1]),
  )
  const maintenance = blocksRes.error
    ? []
    : (blocksRes.data ?? []).map((row) => mapMaintenance(row as Parameters<typeof mapMaintenance>[0]))

  let settings = DEFAULT_SETTINGS
  if (!settingsRes.error && settingsRes.data) {
    const row = settingsRes.data as {
      hold_pending_bookings: boolean
      company_commission_rate: number
      default_partner_share: number
      owners_can_block_availability: boolean
      sms_sender_name: string
      locations: string[]
      default_rate_first_day_centavos?: number
      default_rate_succeeding_centavos?: number
      default_rate_10_days_centavos?: number
      default_rate_15_plus_centavos?: number
      default_share_first_day_centavos?: number
      default_share_succeeding_centavos?: number
      default_share_10_days_centavos?: number
      default_share_15_plus_centavos?: number
      driver_inside_per_day_centavos?: number
      driver_outside_first_day_centavos?: number
      driver_outside_succeeding_centavos?: number
      security_deposit_centavos?: number
    }
    const pkgDefault = DEFAULT_SETTINGS.defaultRentalPackage
    const shareDefault = DEFAULT_SETTINGS.defaultPartnerFixedShare
    const driverDefault = DEFAULT_SETTINGS.defaultDriverPackage
    const toPeso = (centavos: number | undefined, fallback: number) =>
      (centavos ?? Math.round(fallback * 100)) / 100
    settings = {
      holdPendingBookings: row.hold_pending_bookings,
      companyCommissionRate: row.company_commission_rate,
      defaultPartnerShare: row.default_partner_share,
      ownersCanBlockAvailability: row.owners_can_block_availability,
      smsSenderName: row.sms_sender_name,
      locations: row.locations ?? DEFAULT_SETTINGS.locations,
      defaultRentalPackage: {
        rateFirstDay: toPeso(row.default_rate_first_day_centavos, pkgDefault.rateFirstDay),
        rateSucceeding: toPeso(row.default_rate_succeeding_centavos, pkgDefault.rateSucceeding),
        rate10Days: toPeso(row.default_rate_10_days_centavos, pkgDefault.rate10Days),
        rate15Plus: toPeso(row.default_rate_15_plus_centavos, pkgDefault.rate15Plus),
      },
      defaultPartnerFixedShare: {
        rateFirstDay: toPeso(row.default_share_first_day_centavos, shareDefault.rateFirstDay),
        rateSucceeding: toPeso(row.default_share_succeeding_centavos, shareDefault.rateSucceeding),
        rate10Days: toPeso(row.default_share_10_days_centavos, shareDefault.rate10Days),
        rate15Plus: toPeso(row.default_share_15_plus_centavos, shareDefault.rate15Plus),
      },
      defaultDriverPackage: {
        insidePerDay: toPeso(row.driver_inside_per_day_centavos, driverDefault.insidePerDay),
        outsideFirstDay: toPeso(row.driver_outside_first_day_centavos, driverDefault.outsideFirstDay),
        outsideSucceeding: toPeso(row.driver_outside_succeeding_centavos, driverDefault.outsideSucceeding),
      },
      securityDepositAmount: toPeso(row.security_deposit_centavos, DEFAULT_SETTINGS.securityDepositAmount),
    }
  }

  const notifications =
    notificationsRes.error || !notificationsRes.data
      ? []
      : notificationsRes.data.map((row) => {
          const note = row as {
            id: string
            user_id: string
            title: string
            body: string
            read: boolean
            created_at: string
            href: string | null
          }
          return {
            id: note.id,
            userId: note.user_id,
            title: note.title,
            body: note.body,
            read: note.read,
            createdAt: note.created_at,
            href: note.href ?? undefined,
          }
        })

  const payments = paymentsRes.error
    ? []
    : (paymentsRes.data ?? []).map((row) => mapPayment(row as Parameters<typeof mapPayment>[0]))

  const applications = applicationsRes.error
    ? []
    : (applicationsRes.data ?? []).map((row) => mapApplication(row as Parameters<typeof mapApplication>[0]))

  const favorites = favoritesRes.error
    ? []
    : (favoritesRes.data ?? []).map((row) => ({
        userId: (row as { user_id: string; vehicle_id: string }).user_id,
        vehicleId: (row as { user_id: string; vehicle_id: string }).vehicle_id,
      }))

  const inquiries = inquiriesRes.error
    ? []
    : (inquiriesRes.data ?? []).map((row) => {
        const item = row as {
          id: string
          name: string
          email: string
          phone: string
          message: string
          vehicle_id: string | null
          created_at: string
        }
        return {
          id: item.id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          message: item.message,
          vehicleId: item.vehicle_id ?? undefined,
          createdAt: item.created_at,
        }
      })

  const tail = emptySnapshotTail(sessionUserId)

  let partnerDisbursements = tail.partnerDisbursements
  try {
    partnerDisbursements = await listPartnerDisbursements()
  } catch {
    partnerDisbursements = []
  }

  return {
    ...tail,
    users,
    vehicles,
    bookings,
    maintenance,
    payments,
    partnerDisbursements,
    applications,
    favorites,
    inquiries,
    settings,
    notifications: notifications.length ? notifications : tail.notifications,
    sessionUserId,
    version: Date.now(),
  }
}