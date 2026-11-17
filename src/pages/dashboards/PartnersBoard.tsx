import { Banknote, CarFront, CalendarCheck, Coins, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RecordDisbursementModal } from '@/components/partners/RecordDisbursementModal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Panel } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Fields'
import { Modal } from '@/components/ui/Modal'
import { useFinancial } from '@/hooks/useFinancial'
import { useDemoActions, useSnapshot } from '@/hooks/useDemo'
import { isSupabaseProvider } from '@/lib/config'
import { PersonProfile } from '@/pages/dashboards/partnerProfile'
import type { PartnerApplication, User } from '@/types'
import { cn } from '@/utils/cn'
import { formatPretty } from '@/utils/dates'
import {
  buildPartnerRentalLines,
  displayPartnerName,
  globalPartnerStats,
  listPartnerAccounts,
  partnerDirectoryRowStats,
  payableByPartner,
  weeklyPartnerShareSeries,
} from '@/utils/partnerLedger'
import { formatPeso } from '@/utils/money'

function PartnerKpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Users
  tone: string
}) {
  return (
    <Panel>
      <span className={cn('grid h-10 w-10 place-items-center rounded-xl', tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </Panel>
  )
}

export function PartnersBoard() {
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const financial = useFinancial()
  const [params] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [appsOpen, setAppsOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(params.get('disburse') === '1')
  const [payPartnerId, setPayPartnerId] = useState<string | undefined>()

  const earnings = financial.earnings.data ?? []
  const disbursements = data?.partnerDisbursements ?? []

  const partnerAccounts = useMemo(() => (data ? listPartnerAccounts(data) : []), [data])

  const partners = useMemo(() => {
    return partnerAccounts.filter((user) =>
      `${displayPartnerName(user)} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
    )
  }, [partnerAccounts, search])

  const stats = useMemo(() => {
    if (!data) return null
    return globalPartnerStats(data, disbursements, earnings)
  }, [data, disbursements, earnings])

  const lines = useMemo(() => {
    if (!data) return []
    return buildPartnerRentalLines(data, disbursements, earnings)
  }, [data, disbursements, earnings])

  const weekly = useMemo(() => weeklyPartnerShareSeries(lines), [lines])
  const payableChart = useMemo(() => (data ? payableByPartner(data, disbursements, earnings) : []), [data, disbursements, earnings])

  const application = data?.applications.find((item) => item.id === applicationId)
  const pendingApps = data?.applications.filter((item) => item.status === 'pending').length ?? 0

  if (!data) return null

  const openDisburse = (partnerId?: string, amount?: number) => {
    setPayPartnerId(partnerId)
    setPayOpen(true)
    if (partnerId && amount != null) {
      // defaultAmount passed via modal props below
    }
  }

  const defaultPayAmount = payPartnerId
    ? partnerDirectoryRowStats(data, disbursements, partners.find((p) => p.id === payPartnerId)!, earnings).outstandingPayable
    : stats?.outstandingPayable

  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Partners</h1>
          <p className="text-sm text-muted">Fleet links, rental earnings, and disbursements</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search partners" className="max-w-xs" />
          <Button type="button" variant="outline" onClick={() => openDisburse()}>
            Record disbursement
          </Button>
          <Link to="/admin/partners/register">
            <Button type="button">Register partner</Button>
          </Link>
        </div>
      </Panel>

      {pendingApps > 0 ? (
        <Panel>
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setAppsOpen((value) => !value)}>
            <span className="font-bold">Pending applications ({pendingApps})</span>
            <span className="text-xs text-info">{appsOpen ? 'Hide' : 'Show'}</span>
          </button>
          {appsOpen ? (
            <div className="mt-3 space-y-2">
              {data.applications
                .filter((item) => item.status === 'pending')
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm"
                    onClick={() => setApplicationId(item.id)}
                  >
                    <span>{item.fullName} · {item.vehicleDetails}</span>
                    <StatusBadge value={item.status} />
                  </button>
                ))}
            </div>
          ) : null}
        </Panel>
      ) : null}

      {stats ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <PartnerKpi label="Active partners" value={String(stats.activePartners)} icon={Users} tone="bg-violet-100 text-violet-700" />
          <PartnerKpi label="Partner fleet" value={String(stats.fleetCount)} icon={CarFront} tone="bg-blue-100 text-info" />
          <PartnerKpi label="Partner rentals" value={String(stats.rentalCount)} icon={CalendarCheck} tone="bg-canvas text-navy" />
          <PartnerKpi label="Partner share earned" value={formatPeso(stats.shareEarned)} icon={Coins} tone="bg-amber-100 text-amber-700" />
          <PartnerKpi label="Outstanding payable" value={formatPeso(stats.outstandingPayable)} icon={Wallet} tone="bg-rose-100 text-rose-700" />
          <PartnerKpi label="Total disbursed" value={formatPeso(stats.totalDisbursed)} icon={Banknote} tone="bg-emerald-100 text-success" />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="h-72">
          <h2 className="font-bold">Partner share earned (weekly)</h2>
          <p className="text-xs text-muted">Last 8 weeks · fixed share tiers</p>
          <div className="h-[85%]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatPeso(Number(value ?? 0))} />
                <Bar dataKey="value" fill="#ffc400" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="h-72">
          <h2 className="font-bold">Outstanding payable by partner</h2>
          <p className="text-xs text-muted">Top partners with balance due</p>
          <div className="h-[85%]">
            {payableChart.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted">No outstanding balances.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payableChart} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatPeso(Number(value ?? 0))} />
                  <Bar dataKey="value" fill="#2563eb" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <h2 className="mb-3 text-lg font-bold">Partner directory</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Fleet</th>
                <th>Rentals</th>
                <th>Outstanding</th>
                <th>Disbursed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {partners.map((person) => {
                const row = partnerDirectoryRowStats(data, disbursements, person, earnings)
                const name = displayPartnerName(person)
                return (
                  <tr key={person.id} className="border-t">
                    <td className="py-2 font-semibold">
                      {name}
                      <span className="block text-xs font-normal text-muted">{person.email}</span>
                    </td>
                    <td>{person.phone || '—'}</td>
                    <td>
                      <StatusBadge value={person.status} />
                    </td>
                    <td>{row.fleetCount}</td>
                    <td>{row.rentalCount}</td>
                    <td className="font-semibold text-rose-600">{formatPeso(row.outstandingPayable)}</td>
                    <td className="text-success">{formatPeso(row.totalDisbursed)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelected(person)}>
                          Profile
                        </Button>
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          disabled={row.outstandingPayable <= 0}
                          onClick={() => openDisburse(person.id, row.outstandingPayable)}
                        >
                          Pay
                        </Button>
                        <Button
                          type="button"
                          variant={person.status === 'active' ? 'soft' : 'primary'}
                          size="sm"
                          onClick={() => actions.updateUser(person.id, { status: person.status === 'active' ? 'suspended' : 'active' })}
                        >
                          {person.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-3 text-lg font-bold">Rental activity</h2>
        <p className="mb-3 text-xs text-muted">Confirmed, ongoing, and completed rentals on partner vehicles</p>
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No partner rentals yet. Bookings on partner cars will accrue fixed share here.</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs text-muted">
                <tr>
                  <th>Booking</th>
                  <th>Partner</th>
                  <th>Vehicle</th>
                  <th>Dates</th>
                  <th>Partner share</th>
                  <th>Payout</th>
                </tr>
              </thead>
              <tbody>
                {[...lines].reverse().slice(0, 40).map((line) => (
                  <tr key={line.bookingId} className="border-t">
                    <td className="py-2 font-semibold">{line.reference}</td>
                    <td>{line.partnerName}</td>
                    <td>{line.vehicleName}</td>
                    <td className="text-xs text-muted">
                      {formatPretty(line.pickupDate)} – {formatPretty(line.returnDate)}
                    </td>
                    <td>{formatPeso(line.shareAmount)}</td>
                    <td>
                      <StatusBadge value={line.payoutStatus === 'paid' ? 'paid' : 'unpaid'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Disbursement history</h2>
          <Button type="button" size="sm" onClick={() => openDisburse()}>
            Record disbursement
          </Button>
        </div>
        {disbursements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No disbursements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th>Date</th>
                  <th>Partner</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {disbursements.map((row) => {
                  const partner = data.users.find((user) => user.id === row.partnerId)
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="py-2">{formatPretty(row.paidAt.slice(0, 10))}</td>
                      <td>{partner ? displayPartnerName(partner) : row.partnerId}</td>
                      <td className="font-semibold">{formatPeso(row.amount)}</td>
                      <td className="font-mono text-xs">{row.payoutReference}</td>
                      <td className="capitalize">{row.method ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {isSupabaseProvider() ? (
          <p className="mt-3 text-xs text-muted">
            Period batch settlements: <Link to="/admin/settlements" className="font-bold text-info">Admin → Settlements</Link>
          </p>
        ) : null}
      </Panel>

      <RecordDisbursementModal
        open={payOpen}
        onClose={() => {
          setPayOpen(false)
          setPayPartnerId(undefined)
        }}
        partners={partnerAccounts}
        defaultPartnerId={payPartnerId}
        defaultAmount={payPartnerId ? defaultPayAmount : undefined}
        resolveOutstanding={(id) => {
          const person = partnerAccounts.find((user) => user.id === id)
          if (!person) return undefined
          return partnerDirectoryRowStats(data, disbursements, person, earnings).outstandingPayable
        }}
      />

      <ModalWrapper selected={selected} onClose={() => setSelected(null)} />

      <ApplicationModal application={application} onClose={() => setApplicationId(null)} actions={actions} />
    </div>
  )
}

function ModalWrapper({ selected, onClose }: { selected: User | null; onClose: () => void }) {
  return (
    <Modal open={!!selected} onClose={onClose} title={selected?.role === 'partner' ? 'Partner profile' : (selected?.name ?? '')} wide>
      {selected ? <PersonProfile person={selected} onClose={onClose} /> : null}
    </Modal>
  )
}

function ApplicationModal({
  application,
  onClose,
  actions,
}: {
  application: PartnerApplication | undefined
  onClose: () => void
  actions: ReturnType<typeof useDemoActions>
}) {
  return (
    <Modal open={!!application} onClose={onClose} title="Partner application">
      {application ? (
        <div className="space-y-2 text-sm">
          <p>{application.fullName} · {application.email} · {application.phone}</p>
          <p>{application.address}</p>
          <p>{application.vehicleDetails}</p>
          <p>{application.ownershipType} · {application.vehicleCount} vehicle(s)</p>
          <p>{application.notes}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => actions.reviewApplication(application.id, 'approved').then(() => onClose())}>Approve</Button>
            <Button variant="danger" onClick={() => actions.reviewApplication(application.id, 'rejected').then(() => onClose())}>
              Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => actions.reviewApplication(application.id, 'needs_info', undefined, 'Please send clearer vehicle details.').then(() => onClose())}
            >
              Request info
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}