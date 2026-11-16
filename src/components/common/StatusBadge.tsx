import { cn } from '@/utils/cn'

const tones: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-600',
  rejected: 'bg-red-100 text-red-600',
  available: 'bg-emerald-500 text-white',
  on_rental: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  unavailable: 'bg-rose-500 text-white',
  paid: 'bg-emerald-100 text-emerald-700',
  unpaid: 'bg-slate-100 text-slate-600',
  partial: 'bg-amber-100 text-amber-700',
  verified: 'bg-emerald-100 text-emerald-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-600',
  approved: 'bg-emerald-100 text-emerald-700',
  needs_info: 'bg-sky-100 text-sky-700',
  archived: 'bg-slate-200 text-slate-500',
  simulated: 'bg-violet-100 text-violet-700',
  upcoming: 'bg-amber-100 text-amber-700',
}

const labels: Record<string, string> = {
  on_rental: 'On Rental',
  self_drive: 'Self-Drive',
  with_driver: 'With Driver',
  needs_info: 'Needs info',
  pending: 'Pending',
  confirmed: 'Confirmed',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  available: 'Available',
  unavailable: 'Not Available',
  maintenance: 'Maintenance',
  paid: 'Paid',
  unpaid: 'Unpaid',
  partial: 'Partial',
  verified: 'Verified',
  simulated: 'Simulated',
}

export function StatusBadge({ value, solid = false }: { value: string; solid?: boolean }) {
  const key = value.toLowerCase().replaceAll(' ', '_')
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize', solid && key === 'available' ? tones.available : tones[key] ?? 'bg-slate-100 text-slate-600')}>
      {labels[key] ?? value.replaceAll('_', ' ')}
    </span>
  )
}
