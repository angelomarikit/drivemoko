import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useResolvedAssetUrl } from '@/hooks/useSignedAssetUrl'
import { isSupabaseProvider } from '@/lib/config'
import { getDemoContractBlob } from '@/services/demo/contractBlobs'
import type { Booking } from '@/types'
import { contractFileName, downloadContractBlob } from '@/utils/rentalContract'

export function BookingContractDownload({ booking }: { booking: Booking }) {
  const { url, loading } = useResolvedAssetUrl(booking.contractStoragePath)
  if (!booking.contractStoragePath) return null

  const fileName = contractFileName(booking.reference)

  const download = () => {
    if (!isSupabaseProvider()) {
      const blob = getDemoContractBlob(booking.id)
      if (!blob) return
      downloadContractBlob(blob, fileName)
      return
    }
    if (!url) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.click()
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading && isSupabaseProvider()} onClick={download}>
      <FileDown className="h-4 w-4" aria-hidden />
      Download signed contract
    </Button>
  )
}