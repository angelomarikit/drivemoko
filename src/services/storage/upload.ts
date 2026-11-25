import { getSupabaseClient } from '@/lib/supabase/client'
import { DOC_ACCEPT, IMAGE_ACCEPT, IMAGE_MAX_BYTES, VIDEO_ACCEPT, VIDEO_MAX_BYTES, type StorageBucketId } from '@/lib/storage/buckets'
import { parseStorageObjectPath } from '@/services/storage/paths'
import { resizeImageFile } from '@/utils/files'
export type UploadProgress = (ratio: number) => void

function validateFile(file: File, accept: readonly string[], maxBytes: number) {
  if (!accept.includes(file.type)) {
    throw new Error('File type is not allowed. Use JPEG, PNG, or WebP.')
  }
  if (file.size > maxBytes) {
    throw new Error(`File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).`)
  }
}

export async function uploadStorageObject(
  fullPath: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string; onProgress?: UploadProgress },
) {
  const parsed = parseStorageObjectPath(fullPath)
  if (!parsed) throw new Error('Invalid storage path.')
  const supabase = getSupabaseClient()
  options?.onProgress?.(0.2)
  const { error } = await supabase.storage.from(parsed.bucket as StorageBucketId).upload(parsed.objectPath, file, {
    upsert: options?.upsert ?? false,
    contentType: options?.contentType ?? (file instanceof File ? file.type : 'application/octet-stream'),
  })
  options?.onProgress?.(1)
  if (error) {
    throw new Error(error.message || 'Upload failed.')
  }
  return fullPath
}

export async function uploadImageAsset(fullPath: string, file: File, onProgress?: UploadProgress) {
  validateFile(file, IMAGE_ACCEPT, IMAGE_MAX_BYTES)
  const blob = await resizeImageFile(file, 1600, 0.82)
  return uploadStorageObject(fullPath, blob, { upsert: true, contentType: 'image/jpeg', onProgress })
}

export async function uploadVideoAsset(fullPath: string, file: File, onProgress?: UploadProgress) {
  if (!VIDEO_ACCEPT.includes(file.type as (typeof VIDEO_ACCEPT)[number])) {
    throw new Error('Use MP4 or WebM video.')
  }
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error(`Video is too large (max ${Math.round(VIDEO_MAX_BYTES / (1024 * 1024))} MB).`)
  }
  return uploadStorageObject(fullPath, file, { upsert: true, contentType: file.type, onProgress })
}

export async function uploadDocumentAsset(fullPath: string, file: File, onProgress?: UploadProgress) {
  validateFile(file, DOC_ACCEPT, 8 * 1024 * 1024)
  const body = file.type.startsWith('image/') ? await resizeImageFile(file, 2000, 0.85) : file
  return uploadStorageObject(fullPath, body, {
    upsert: true,
    contentType: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
    onProgress,
  })
}

/** Re-tapping Confirm reuses the same contract path — upsert so a retry does not fail. */
export async function uploadContractAsset(fullPath: string, file: File, onProgress?: UploadProgress) {
  validateFile(file, DOC_ACCEPT, 8 * 1024 * 1024)
  return uploadStorageObject(fullPath, file, {
    upsert: true,
    contentType: 'application/pdf',
    onProgress,
  })
}

export async function removeStorageObject(fullPath: string) {
  const parsed = parseStorageObjectPath(fullPath)
  if (!parsed) return
  const supabase = getSupabaseClient()
  const { error } = await supabase.storage.from(parsed.bucket as StorageBucketId).remove([parsed.objectPath])
  if (error) throw new Error(error.message)
}

export async function createSignedDownloadUrl(fullPath: string, expiresInSeconds = 120) {
  const parsed = parseStorageObjectPath(fullPath)
  if (!parsed) throw new Error('Invalid storage path.')
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.storage
    .from(parsed.bucket as StorageBucketId)
    .createSignedUrl(parsed.objectPath, expiresInSeconds)
  if (error) throw new Error(error.message)
  return data.signedUrl
}