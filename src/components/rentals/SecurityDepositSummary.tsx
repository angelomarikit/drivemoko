import { formatPeso } from '@/utils/money'

export function SecurityDepositSummary({ amount }: { amount: number }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="font-semibold text-ink">Security deposit</span>
      <span className="text-right text-sm">
        <span className="font-bold text-danger">{formatPeso(amount)}</span>
        <span className="ml-1 font-medium text-ink">(Refundable)</span>
      </span>
    </div>
  )
}