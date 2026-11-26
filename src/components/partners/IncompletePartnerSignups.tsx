import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/layout/DashboardLayout'
import { isSupabaseProvider } from '@/lib/config'
import {
  finalizeIncompletePartnerSignup,
  listIncompletePartnerSignups,
} from '@/services/supabase/partnerProvisioning'
import { useDataVersionStore } from '@/stores/dataVersionStore'
import { friendlyErrorMessage } from '@/utils/friendlyError'
import { Link } from 'react-router-dom'

export function IncompletePartnerSignups() {
  const bump = useDataVersionStore((state) => state.bump)
  const dataVersion = useDataVersionStore((state) => state.version)
  const query = useQuery({
    queryKey: ['incomplete-partner-signups', dataVersion],
    enabled: isSupabaseProvider(),
    queryFn: listIncompletePartnerSignups,
    staleTime: 30_000,
  })

  if (!isSupabaseProvider()) return null
  const rows = query.data ?? []
  if (query.isLoading) {
    return (
      <Panel className="border-amber-200 bg-amber-50/50">
        <p className="text-sm text-muted">Checking for incomplete partner signups…</p>
      </Panel>
    )
  }
  if (!rows.length) return null

  const finalize = async (profileId: string, email: string) => {
    try {
      await finalizeIncompletePartnerSignup(profileId)
      bump()
      await query.refetch()
      toast.success(`${email} is now a partner. Update contract details via Register partner if needed.`)
    } catch (error) {
      toast.error(friendlyErrorMessage(error, 'account'))
    }
  }

  return (
    <Panel className="border-amber-300 bg-amber-50/60">
      <h3 className="text-sm font-bold text-amber-950">Incomplete partner signups ({rows.length})</h3>
      <p className="mt-1 text-xs text-amber-900/80">
        These @drivemoko.com logins exist in Auth but are not partners yet (registration stopped before finalize). Use
        Finalize to promote them, or{' '}
        <Link to="/admin/partners/register" className="font-semibold underline">
          re-run full registration
        </Link>{' '}
        with the same email to apply your contract form data.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 py-2">
            <span>
              <strong>{row.full_name || row.email}</strong>
              <span className="ml-2 text-muted">{row.email}</span>
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs capitalize">{row.role}</span>
            </span>
            <Button type="button" size="sm" onClick={() => void finalize(row.id, row.email)}>
              Finalize as partner
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}