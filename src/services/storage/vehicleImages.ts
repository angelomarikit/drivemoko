import { vehicleImagePath } from '@/services/storage/paths'
import { removeStorageObject, uploadImageAsset } from '@/services/storage/upload'

export async function uploadVehiclePhoto(file: File, vehicleId: string, listingApproved: boolean) {
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const fileName = `${crypto.randomUUID()}.${ext}`
  const path = vehicleImagePath(vehicleId, fileName, listingApproved)
  await uploadImageAsset(path, file)
  return path
}

export async function deleteVehiclePhoto(storagePath: string) {
  if (storagePath.startsWith('/') || storagePath.startsWith('http') || storagePath.startsWith('data:')) return
  await removeStorageObject(storagePath)
}