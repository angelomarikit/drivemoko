import { Film } from 'lucide-react'
import { useResolvedAssetUrl } from '@/hooks/useSignedAssetUrl'
import { resolvePublicAssetUrl } from '@/services/storage/resolveUrl'
import { cn } from '@/utils/cn'

export function VehicleVideo({ src, className, poster }: { src?: string; className?: string; poster?: string }) {
  const publicSrc = resolvePublicAssetUrl(src)
  const signed = useResolvedAssetUrl(publicSrc ? undefined : src)
  const resolved = publicSrc ?? signed.url ?? (src?.startsWith('data:') || src?.startsWith('blob:') ? src : undefined)

  if (!resolved) {
    return (
      <div className={cn('grid place-items-center rounded-2xl bg-canvas text-muted', className)}>
        <Film className="h-10 w-10" />
      </div>
    )
  }

  return (
    <video
      className={cn('w-full rounded-2xl bg-black', className)}
      controls
      playsInline
      preload="metadata"
      poster={poster}
      src={resolved}
    >
      Your browser does not support video playback.
    </video>
  )
}