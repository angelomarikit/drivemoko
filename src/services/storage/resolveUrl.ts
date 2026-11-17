import { supabaseConfigured } from '@/lib/config'
import { STORAGE_BUCKETS } from '@/lib/storage/buckets'
import { parseStorageObjectPath } from '@/services/storage/paths'

const PRIVATE_BUCKETS = new Set<string>([
  STORAGE_BUCKETS.vehicleImagesStaging,
  STORAGE_BUCKETS.paymentProofs,
  STORAGE_BUCKETS.rentalDocuments,
  STORAGE_BUCKETS.inspectionPhotos,
])

/** Returns a display URL for public vehicle images or local/static assets. */
export function resolvePublicAssetUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) return path
  const parsed = parseStorageObjectPath(path)
  if (!parsed) return path
  if (PRIVATE_BUCKETS.has(parsed.bucket)) {
    return undefined
  }
  if (!supabaseConfigured()) return path
  const base = import.meta.env.VITE_SUPABASE_URL!.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${parsed.bucket}/${parsed.objectPath}`
}

export function needsSignedUrl(path?: string) {
  if (!path) return false
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) return false
  const parsed = parseStorageObjectPath(path)
  if (!parsed) return false
  return PRIVATE_BUCKETS.has(parsed.bucket as (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS])
}