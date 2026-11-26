import { ExternalLink, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useResolvedAssetUrl } from '@/hooks/useSignedAssetUrl'
import type { Booking } from '@/types'

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?.*)?$/i

function RenterDocumentCard({ label, path }: { label: string; path: string }) {
  const { url, loading } = useResolvedAssetUrl(path)
  const showImage = IMAGE_EXT.test(path) || (!path.toLowerCase().endsWith('.pdf') && !!url && IMAGE_EXT.test(url))

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      {loading ? <p className="mt-2 text-xs text-muted">Loading…</p> : null}
      {!loading && url ? (
        <div className="mt-2 space-y-2">
          {showImage ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={url} alt={label} className="max-h-40 w-full rounded-lg border border-slate-200 bg-white object-contain" />
            </a>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open
            </Button>
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={() => {
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = path.split('/').pop() ?? 'document'
                anchor.target = '_blank'
                anchor.rel = 'noopener noreferrer'
                anchor.click()
              }}
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden />
              Download
            </Button>
          </div>
        </div>
      ) : null}
      {!loading && !url ? <p className="mt-2 text-xs text-muted">Could not load this file. Check storage access.</p> : null}
    </div>
  )
}

export function BookingRenterDocuments({ booking }: { booking: Booking }) {
  const items: { label: string; path?: string }[] = [
    { label: "Driver's license", path: booking.documentName },
    { label: 'Valid ID', path: booking.validIdStoragePath },
    { label: 'Proof of billing / barangay clearance', path: booking.proofOfBillingStoragePath },
  ]
  const present = items.filter((item) => item.path?.trim())
  if (!present.length) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-muted">
        No renter verification documents on file for this booking.
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-bold">Renter documents</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {present.map((item) => (
          <RenterDocumentCard key={item.label} label={item.label} path={item.path!} />
        ))}
      </div>
    </div>
  )
}