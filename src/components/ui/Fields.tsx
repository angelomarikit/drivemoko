import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { DayPicker } from 'react-day-picker'
import { manilaYmd } from '@/utils/dates'
import { cn } from '@/utils/cn'

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {required ? <span className="text-danger"> *</span> : null}
    </span>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none ring-gold placeholder:text-slate-400 focus:ring-2 focus:ring-inset',
        className,
      )}
      {...props}
    />
  )
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn('min-h-24 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none ring-gold placeholder:text-slate-400 focus:ring-2 focus:ring-inset', className)}
      {...props}
    />
  )
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn('h-11 w-full appearance-none rounded-xl border border-line bg-white px-3 pr-9 text-sm outline-none ring-gold focus:ring-2 focus:ring-inset', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  )
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <p className="mt-1 text-xs font-medium text-danger">{children}</p>
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function fromYmd(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function DateField({
  label,
  value,
  onChange,
  required,
  disablePast,
  isDateDisabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disablePast?: boolean
  /** When true, the day cannot be selected (e.g. booked or in maintenance). */
  isDateDisabled?: (ymd: string) => boolean
}) {
  const [open, setOpen] = useState(false)
  const today = fromYmd(manilaYmd())
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-white px-3 text-left text-sm">
          <CalendarDays className="h-4 w-4 text-muted" />
          <span className={value ? 'text-ink' : 'text-slate-400'}>{value ? fromYmd(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-[60] rounded-2xl border border-line bg-white p-2 shadow-xl" sideOffset={6}>
            <DayPicker
              mode="single"
              selected={value ? fromYmd(value) : undefined}
              onSelect={(date) => {
                if (!date) return
                onChange(toYmd(date))
                setOpen(false)
              }}
              disabled={(date) => {
                if (disablePast && date < today) return true
                if (isDateDisabled?.(toYmd(date))) return true
                return false
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
