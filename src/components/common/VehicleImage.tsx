import { Car } from 'lucide-react'
import { useState } from 'react'
import { useResolvedAssetUrl } from '@/hooks/useSignedAssetUrl'
import { resolvePublicAssetUrl } from '@/services/storage/resolveUrl'
import { cn } from '@/utils/cn'

export function VehicleImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const publicSrc = resolvePublicAssetUrl(src)
  const signed = useResolvedAssetUrl(publicSrc ? undefined : src)
  const resolved = publicSrc ?? signed.url
  if (!resolved || failed) {
    return (
      <div className={cn('grid place-items-center bg-gradient-to-br from-navy to-navy-2 text-gold', className)}>
        <Car className="h-10 w-10" />
      </div>
    )
  }
  return (
    <img
      src={resolved}
      alt={alt}
      className={cn('object-cover', className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
