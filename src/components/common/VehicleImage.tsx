import { Car } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/cn'

export function VehicleImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={cn('grid place-items-center bg-gradient-to-br from-navy to-navy-2 text-gold', className)}>
        <Car className="h-10 w-10" />
      </div>
    )
  }
  return <img src={src} alt={alt} className={cn('object-cover', className)} onError={() => setFailed(true)} />
}
