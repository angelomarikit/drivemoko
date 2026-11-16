import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { addDays, manilaYmd, monthMeta } from '@/utils/dates'
import { cn } from '@/utils/cn'

export function MiniCalendar({ marked, onPick }: { marked: Set<string>; onPick?: (ymd: string) => void }) {
  const today = manilaYmd()
  const [cursor, setCursor] = useState(today.slice(0, 7))
  const [year, month] = cursor.split('-').map(Number)
  const { firstDow, days } = monthMeta(year, month)
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-canvas" onClick={() => setCursor(addDays(`${cursor}-01`, -1).slice(0, 7))} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold">{label}</p>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-canvas" onClick={() => setCursor(addDays(`${year}-${String(month).padStart(2, '0')}-28`, 10).slice(0, 7))} aria-label="Next month">
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
          const isToday = ymd === today
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onPick?.(ymd)}
              className={cn(
                'mx-auto grid h-8 w-8 place-items-center rounded-full',
                isToday && 'bg-gold font-bold text-ink',
                !isToday && marked.has(ymd) && 'font-semibold text-info',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
