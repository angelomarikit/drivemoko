/** Supabase Storage bucket ids (see migrations 016–017). */
export const STORAGE_BUCKETS = {
  vehicleImages: 'vehicle-images',
  vehicleImagesStaging: 'vehicle-images-staging',
  paymentProofs: 'payment-proofs',
  rentalDocuments: 'rental-documents',
  inspectionPhotos: 'inspection-photos',
} as const

export type StorageBucketId = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const
export const VIDEO_ACCEPT = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export const DOC_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const