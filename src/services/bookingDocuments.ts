import { getSupabaseClient } from '@/lib/supabase/client'
import { isSupabaseProvider, supabaseConfigured } from '@/lib/config'
import { rentalDocumentPath } from '@/services/storage/paths'
import { uploadDocumentAsset } from '@/services/storage/upload'
import type { BookingRenterDocumentFiles } from '@/types'
import { isUuid } from '@/utils/vehicleParam'

function safeFileName(name: string) {
  const base = name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
  return base || 'document'
}

export type RenterDocumentPaths = {
  license?: string
  validId?: string
  proofOfBilling?: string
}

export async function persistRenterDocuments(
  bookingId: string,
  files: BookingRenterDocumentFiles,
): Promise<RenterDocumentPaths> {
  const paths: RenterDocumentPaths = {}
  const uploadToSupabase = isSupabaseProvider() && supabaseConfigured() && isUuid(bookingId)

  const entries: { type: string; file?: File; key: keyof RenterDocumentPaths }[] = [
    { type: 'drivers-license', file: files.license, key: 'license' },
    { type: 'valid-id', file: files.validId, key: 'validId' },
    { type: 'proof-of-billing', file: files.proofOfBilling, key: 'proofOfBilling' },
  ]

  if (uploadToSupabase) {
    const { data: sessionData } = await getSupabaseClient().auth.getSession()
    if (!sessionData.session?.user) {
      throw new Error('You must be signed in to upload your documents. Sign in and try again.')
    }
  }

  for (const { type, file, key } of entries) {
    if (!file) continue
    const path = rentalDocumentPath(bookingId, type, safeFileName(file.name))
    if (uploadToSupabase) {
      await uploadDocumentAsset(path, file)
    }
    paths[key] = path
  }

  return paths
}