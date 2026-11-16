import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useSnapshot } from '@/hooks/useDemo'
import { addDays, formatPretty, manilaYmd, monthMeta } from '@/utils/dates'
import { dayAvailability, vehicleBlocks, vehicleDayMap } from '@/utils/vehicleAvailability'
import { cn } from '@/utils/cn'

const dayTone: Record<string, string> = {
  available: 'bg-emerald-50 text-success ring-1 ring-emerald-100',
  booked: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
  pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  maintenance: 'bg-violet-100 text-violet-800 ring-1 ring-violet-200',
  past: 'text-muted/50',
}

export function VehicleAvailabilityCalendar({ vehicleId, compact }: { vehicleId: string; compact?: boolean }) {
  const { data } = useSnapshot()
  const today = manilaYmd()
  const [cursor, setCursor] = useState(today.slice(0, 7))
  const map = useMemo(() => (data ? vehicleDayMap(vehicleId, data) : new Map()), [data, vehicleId])
  const blocks = useMemo(() => (data ? vehicleBlocks(vehicleId, data) : []), [data, vehicleId])

  if (!data) return null
  const [year, month] = cursor.split('-').map(Number)
  const { firstDow, days } = monthMeta(year, month)
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-canvas"
          onClick={() => setCursor(addDays(`${cursor}-01`, -1).slice(0, 7))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold">{label}</p>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-canvas"
          onClick={() => setCursor(addDays(`${year}-${String(month).padStart(2, '0')}-28`, 10).slice(0, 7))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-semibold text-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, index) => {
          if (!day) return <span key={`e-${index}`} />
          const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status = dayAvailability(ymd, map)
          const isToday = ymd === today
          return (
            <span
              key={ymd}
              title={status}
              className={cn(
                'mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-semibold',
                dayTone[status],
                isToday && status === 'available' && 'ring-2 ring-gold',
              )}
            >
              {day}
            </span>
          )
        })}
      </div>
      <AvailabilityLegend className="mt-4" />
      {!compact && blocks.length > 0 ? (
        <div className="mt-4 rounded-xl bg-canvas p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Upcoming blocks</p>
          <ul className="mt-2 max-h-36 space-y-2 overflow-y-auto text-sm">
            {blocks.slice(0, 8).map((block) => (
              <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 first:border-0 first:pt-0">
                <span className="font-semibold">{block.kind === 'booking' ? block.label : block.label}</span>
                <span className="text-xs text-muted">
                  {formatPretty(block.start)}
                  {block.end !== block.start ? ` – ${formatPretty(block.end)}` : ''}
                </span>
                {block.kind === 'booking' && block.status ? <StatusBadge value={block.status} /> : <StatusBadge value="maintenance" />}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function AvailabilityLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold', className)}>
      <LegendDot tone={dayTone.available} label="Available" />
      <LegendDot tone={dayTone.booked} label="Booked" />
      <LegendDot tone={dayTone.pending} label="Pending hold" />
      <LegendDot tone={dayTone.maintenance} label="Maintenance" />
    </div>
  )
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px]', tone)}>·</span>
      {label}
    </span>
  )
}
