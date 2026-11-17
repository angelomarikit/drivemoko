import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FieldLabel, SelectInput, TextArea, TextInput } from '@/components/ui/Fields'
import { Modal } from '@/components/ui/Modal'
import { useDemoActions } from '@/hooks/useDemo'
import type { PaymentMethod, RecordPartnerDisbursementInput, User } from '@/types'
import { displayPartnerName } from '@/utils/partnerLedger'
import { formatPeso } from '@/utils/money'

type Props = {
  open: boolean
  onClose: () => void
  partners: User[]
  /** Only set when opening from a specific partner (e.g. Pay on their row). */
  defaultPartnerId?: string
  defaultAmount?: number
  resolveOutstanding?: (partnerId: string) => number | undefined
  onRecorded?: () => void
}

export function RecordDisbursementModal({
  open,
  onClose,
  partners,
  defaultPartnerId,
  defaultAmount,
  resolveOutstanding,
  onRecorded,
}: Props) {
  const actions = useDemoActions()
  const [partnerId, setPartnerId] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('gcash')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setPartnerId(defaultPartnerId ?? '')
    if (defaultPartnerId) {
      const suggested =
        defaultAmount ?? (resolveOutstanding ? resolveOutstanding(defaultPartnerId) : undefined)
      setAmount(suggested != null && suggested > 0 ? String(suggested) : '')
    } else {
      setAmount('')
    }
    setReference('')
    setMethod('gcash')
    setNotes('')
  }, [open, defaultPartnerId, defaultAmount, resolveOutstanding])

  const outstandingHint = useMemo(() => {
    if (!partnerId) return undefined
    return resolveOutstanding?.(partnerId)
  }, [partnerId, resolveOutstanding])

  const onPartnerChange = (id: string) => {
    setPartnerId(id)
    if (!id) {
      setAmount('')
      return
    }
    const owed = resolveOutstanding?.(id)
    if (owed != null && owed > 0) setAmount(String(owed))
  }

  const save = async () => {
    setBusy(true)
    try {
      const input: RecordPartnerDisbursementInput = {
        partnerId,
        amount: Number(amount),
        payoutReference: reference,
        method,
        notes: notes || undefined,
      }
      await actions.recordPartnerDisbursement(input)
      onRecorded?.()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record disbursement">
      <p className="mb-3 text-xs text-muted">Lump-sum payout sent to the partner. Reference can be a GCash / bank trace number.</p>
      <div className="grid gap-3">
        <label>
          <FieldLabel>Partner</FieldLabel>
          {partners.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-canvas px-3 py-3 text-sm text-muted">
              No partner accounts yet. Use <strong>Register partner</strong> or link a vehicle to a partner profile.
            </p>
          ) : (
            <SelectInput value={partnerId} onChange={(event) => onPartnerChange(event.target.value)}>
              <option value="">Select partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {displayPartnerName(partner)} ({partner.email})
                </option>
              ))}
            </SelectInput>
          )}
        </label>
        <label>
          <FieldLabel>Amount (₱)</FieldLabel>
          <TextInput type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          {partnerId && outstandingHint != null ? (
            <span className="mt-1 block text-xs text-muted">Outstanding: {formatPeso(outstandingHint)}</span>
          ) : null}
        </label>
        <label>
          <FieldLabel>Payout reference</FieldLabel>
          <TextInput value={reference} onChange={(event) => setReference(event.target.value)} placeholder="GCash ref, transfer ID, etc." />
        </label>
        <label>
          <FieldLabel>Method</FieldLabel>
          <SelectInput value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
            <option value="bank">Bank transfer</option>
            <option value="cash">Cash</option>
          </SelectInput>
        </label>
        <label>
          <FieldLabel>Notes (optional)</FieldLabel>
          <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
        </label>
        <Button type="button" disabled={busy || !partnerId} onClick={save}>
          Record disbursement
        </Button>
      </div>
    </Modal>
  )
}