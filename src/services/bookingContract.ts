import { getSupabaseClient } from '@/lib/supabase/client'
import { isSupabaseProvider, supabaseConfigured } from '@/lib/config'
import { storeDemoContractBlob } from '@/services/demo/contractBlobs'
import { parseStorageObjectPath, rentalDocumentPath } from '@/services/storage/paths'
import { uploadContractAsset } from '@/services/storage/upload'
import { buildRentalContractPdf, contractFileName, type RentalContractData } from '@/utils/rentalContract'
import { isUuid } from '@/utils/vehicleParam'

export type BookingContractInput = Omit<RentalContractData, 'reference'>

async function resolveBookingIdForStorage(bookingId: string, reference: string): Promise<string> {
  if (isUuid(bookingId)) return bookingId
  if (!supabaseConfigured()) return bookingId

  const supabase = getSupabaseClient()

  if (reference) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('reference', reference)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data?.id && isUuid(data.id)) return data.id
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (userId) {
    const { data: rows, error } = await supabase
      .from('bookings')
      .select('id, reference, created_at')
      .eq('customer_id', userId)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) throw new Error(error.message)
    const byRef = reference ? rows?.find((row) => row.reference === reference) : undefined
    const picked = byRef ?? rows?.[0]
    if (picked?.id && isUuid(picked.id)) return picked.id
  }

  throw new Error('Could not save the signed contract. Refresh the page and confirm again.')
}

export async function persistBookingContract(
  bookingId: string,
  reference: string,
  contract: BookingContractInput,
): Promise<{
  contractStoragePath: string
  contractSignedAt: string
  contractSignerName: string
}> {
  const blob = await buildRentalContractPdf({ ...contract, reference })
  const uploadToSupabase = isSupabaseProvider() && supabaseConfigured()
  const fleetBookingId = uploadToSupabase ? await resolveBookingIdForStorage(bookingId, reference) : bookingId

  if (uploadToSupabase && !isUuid(fleetBookingId)) {
    throw new Error('Could not save the signed contract. Refresh the page and confirm again.')
  }

  const path = rentalDocumentPath(fleetBookingId, 'contract', contractFileName(reference))
  const stored = parseStorageObjectPath(path)
  const objectRoot = stored ? stored.objectPath.split('/')[0] : undefined
  if (uploadToSupabase && objectRoot !== fleetBookingId) {
    throw new Error('Could not save the signed contract. Refresh the page and confirm again.')
  }
  const file = new File([blob], contractFileName(reference), { type: 'application/pdf' })

  if (uploadToSupabase) {
    await uploadContractAsset(path, file)
  } else {
    storeDemoContractBlob(fleetBookingId, blob)
  }

  return {
    contractStoragePath: path,
    contractSignedAt: contract.signedAtIso,
    contractSignerName: contract.renterName,
  }
}