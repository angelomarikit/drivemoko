import { vehiclePromoVideoPath } from '@/services/storage/paths'
import { uploadVideoAsset } from '@/services/storage/upload'

export async function uploadVehiclePromoVideo(file: File, vehicleId: string, listingApproved: boolean) {
  const ext =
    file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4'
  const fileName = `promo-${crypto.randomUUID()}.${ext}`
  const path = vehiclePromoVideoPath(vehicleId, fileName, listingApproved)
  await uploadVideoAsset(path, file)
  return path
}