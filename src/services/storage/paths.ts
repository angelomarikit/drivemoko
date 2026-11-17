import { STORAGE_BUCKETS, type StorageBucketId } from '@/lib/storage/buckets'

/** Stored in DB as `bucket/relative/path` e.g. `vehicle-images/{vehicleId}/{file}.jpg` */
export function storageObjectPath(bucket: StorageBucketId, relativePath: string) {
  return `${bucket}/${relativePath.replace(/^\/+/, '')}`
}

export function parseStorageObjectPath(fullPath: string): { bucket: string; objectPath: string } | null {
  const slash = fullPath.indexOf('/')
  if (slash <= 0) return null
  return { bucket: fullPath.slice(0, slash), objectPath: fullPath.slice(slash + 1) }
}

export function vehicleImagePath(vehicleId: string, fileName: string, approved: boolean) {
  const bucket = approved ? STORAGE_BUCKETS.vehicleImages : STORAGE_BUCKETS.vehicleImagesStaging
  return storageObjectPath(bucket, `${vehicleId}/${fileName}`)
}

export function vehiclePromoVideoPath(vehicleId: string, fileName: string, approved: boolean) {
  const bucket = approved ? STORAGE_BUCKETS.vehicleImages : STORAGE_BUCKETS.vehicleImagesStaging
  return storageObjectPath(bucket, `${vehicleId}/videos/${fileName}`)
}

export function paymentProofPath(bookingId: string, paymentId: string, fileName: string) {
  return storageObjectPath(STORAGE_BUCKETS.paymentProofs, `${bookingId}/${paymentId}/${fileName}`)
}

export function rentalDocumentPath(bookingId: string, docType: string, fileName: string) {
  return storageObjectPath(STORAGE_BUCKETS.rentalDocuments, `${bookingId}/${docType}/${fileName}`)
}

export function inspectionPhotoPath(bookingId: string, phase: 'checkout' | 'return', fileName: string) {
  return storageObjectPath(STORAGE_BUCKETS.inspectionPhotos, `${bookingId}/${phase}/${fileName}`)
}