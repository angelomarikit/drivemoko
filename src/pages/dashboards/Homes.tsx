import { CalendarDays, CarFront, Clock3, Coins, Plus, Tags, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatusBadge } from '@/components/common/StatusBadge'
import { VehicleImage } from '@/components/common/VehicleImage'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { Panel } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useFinancial } from '@/hooks/useFinancial'
import { useSession, useSnapshot } from '@/hooks/useDemo'
import { isSupabaseProvider } from '@/lib/config'
import { pesoFromCentavos } from '@/services/supabase/financial'
import { partnerEarningsSummary } from '@/utils/financialReports'
import type { Booking, RentalPackage, Role, Vehicle } from '@/types'
import { eachDate, formatPretty, formatTime, manilaYmd } from '@/utils/dates'
import { bookingKpis, dailySeries, earningsTotal, scopedBookings, scopedVehicles, shareAmount, utilization, weeklyBars } from '@/utils/metrics'
import { formatPeso } from '@/utils/money'
import { cn } from '@/utils/cn'
import { PARTNER_COMMISSION_PERCENT } from '@/utils/partnerShare'
import { DriverPackageRates } from '@/components/rentals/DriverPackageRates'
import { RentalPackageRates } from '@/components/rentals/RentalPackageRates'
import { resolveRentalPackage } from '@/utils/rentalPackage'
import { resolvePartnerDashboardPackage } from '@/utils/rentalPackage'

export function AdminHome() {
  const { data } = useSnapshot()
  const navigate = useNavigate()
  const [metric, setMetric] = useState<'bookings' | 'revenue' | 'rentals'>('bookings')
  const [day, setDay] = useState(manilaYmd())
  if (!data) return null
  const kpis = bookingKpis(data.bookings, data.payments, data.users)
  const series = dailySeries(data.bookings, data.payments, metric)
  const marked = markedDays(data.bookings)
  const dayBookings = data.bookings.filter((booking) => booking.pickupDate <= day && day < booking.returnDate && !['cancelled', 'rejected'].includes(booking.status)).slice(0, 4)
  const recent = [...data.bookings].sort((a, b) => b.reference.localeCompare(a.reference)).slice(0, 5)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Bookings" value={String(kpis.totalBookings)} delta={kpis.bookingsDelta} icon={CalendarDays} tone="bg-blue-100 text-info" />
        <Kpi label="Active Rentals" value={String(kpis.activeRentals)} delta={kpis.activeDelta} icon={CarFront} tone="bg-emerald-100 text-success" />
        <Kpi label="Total Revenue" value={formatPeso(kpis.revenue)} delta={kpis.revenueDelta} icon={Coins} tone="bg-amber-100 text-amber-600" />
        <Kpi label="Registered Users" value={String(kpis.users)} delta={kpis.usersDelta} icon={Users} tone="bg-violet-100 text-violet-600" />
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Rental Overview</h2>
            <div className="flex rounded-full bg-canvas p-1 text-xs font-bold">
              {(['bookings', 'revenue', 'rentals'] as const).map((item) => (
                <button key={item} className={cn('rounded-full px-3 py-1 capitalize', metric === item && 'bg-gold')} onClick={() => setMetric(item)}>{item === 'rentals' ? 'Rentals' : item}</button>
              ))}
            </div>
          </div>
          {data.bookings.length === 0 ? (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-muted">
              No bookings yet. Use Quick Actions to create a rental, or book from the public site as a guest.
            </p>
          ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#e6b000" fill="#ffe08a" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </Panel>
        <Panel className="xl:col-span-3">
          <h2 className="mb-3 font-bold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['New Booking', '/admin/bookings?new=1', CalendarDays],
              ['Add Vehicle', '/admin/vehicles?new=1', CarFront],
              ['Add Partner', '/admin/partners?new=1', Users],
              ['Record Payment', '/admin/payments?new=1', Coins],
              ['Send SMS', '/admin/sms?new=1', Clock3],
            ].map(([label, to, Icon]) => (
              <button key={String(label)} onClick={() => navigate(String(to))} className="rounded-2xl bg-canvas px-2 py-3 text-center text-xs font-bold hover:bg-amber-50">
                <Icon className="mx-auto mb-1 h-5 w-5 text-navy" />
                {label as string}
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="relative overflow-hidden p-0 xl:col-span-3">
          <img src="/vehicles/fortuner.jpg" alt="Drive Moko fleet" className="h-full min-h-56 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <p className="text-lg font-black italic">DRIVE MOKO</p>
            <p className="text-xs">CAR RENTALS · Nueva Vizcaya</p>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Upcoming Rentals</h2>
            <button className="text-xs font-bold text-info" onClick={() => navigate('/admin/calendar')}>View Calendar</button>
          </div>
          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <MiniCalendar marked={marked} onPick={setDay} />
            <div className="space-y-2">
              {dayBookings.length === 0 ? <p className="text-sm text-muted">No rentals on this day.</p> : dayBookings.map((booking) => <BookingLine key={booking.id} booking={booking} vehicles={data.vehicles} users={data.users} />)}
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Recent Bookings</h2>
            <button className="text-xs font-bold text-info" onClick={() => navigate('/admin/bookings')}>View All Bookings</button>
          </div>
          <RecentTable bookings={recent} vehicles={data.vehicles} users={data.users} onOpen={(id) => navigate(`/admin/bookings?open=${id}`)} />
        </Panel>
      </div>
    </div>
  )
}

export function PartnerHome() {
  return <FleetHome />
}

function FleetHome() {
  const session = useSession()
  const { data } = useSnapshot()
  const navigate = useNavigate()
  const [day, setDay] = useState(manilaYmd())
  const financial = useFinancial()
  if (!data || !session) return null
  const fleetRole: Role = session.role === 'owner' ? 'partner' : session.role
  const viewer = { role: fleetRole, id: session.id }
  const vehicles = scopedVehicles(data.vehicles, session.role, session.id)
  const bookings = scopedBookings(data.bookings, data.vehicles, session.role, session.id)
  const kpis = bookingKpis(bookings, data.payments.filter((payment) => bookings.some((booking) => booking.id === payment.bookingId)), data.users)
  const legacyEarnings = earningsTotal(bookings, data.vehicles, data.users, data.settings, viewer)
  const partnerDb = partnerEarningsSummary(financial.earnings.data ?? [])
  const earningsTotalValue =
    fleetRole === 'partner' && isSupabaseProvider() && (financial.earnings.data?.length ?? 0) > 0
      ? pesoFromCentavos(partnerDb.settledCentavos + partnerDb.payableCentavos + partnerDb.pendingCentavos)
      : legacyEarnings.total
  const earningsDelta = legacyEarnings.delta
  const adminPackage = resolvePartnerDashboardPackage(session, data.vehicles, data.settings)
  const bars = weeklyBars(bookings, data.vehicles, data.users, data.settings, viewer)
  const base = '/partner'
  const today = manilaYmd()
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Bookings" value={String(kpis.totalBookings)} delta={kpis.bookingsDelta} icon={CalendarDays} tone="bg-blue-100 text-info" />
        <Kpi label="Active Rentals" value={String(bookings.filter((booking) => booking.status === 'ongoing').length)} delta={kpis.activeDelta} icon={CarFront} tone="bg-emerald-100 text-success" />
        <Kpi label={`My commission (${PARTNER_COMMISSION_PERCENT}%)`} value={formatPeso(earningsTotalValue)} delta={earningsDelta} icon={Coins} tone="bg-amber-100 text-amber-600" />
        <PartnerCommissionCard package={adminPackage} />
      </div>
      {fleetRole === 'partner' ? (
        <Panel>
          <h2 className="font-bold">Customer rates (set by admin)</h2>
          <p className="mb-3 text-xs text-muted">
            What renters see when booking your vehicles. Your earnings are {PARTNER_COMMISSION_PERCENT}% of each booking total (quote at confirm).
          </p>
          <div className="grid gap-3 xl:grid-cols-2">
            <RentalPackageRates
              package={vehicles[0] ? resolveRentalPackage(vehicles[0], data.settings) : data.settings.defaultRentalPackage}
              compact
            />
            <DriverPackageRates driverZone="inside" withDriver={false} days={2} package={data.settings.defaultDriverPackage} compact />
          </div>
        </Panel>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{`My Listed Vehicles (${vehicles.length})`}</h2>
            <Button size="sm" onClick={() => navigate(`${base}/vehicles?new=1`)}><Plus className="h-4 w-4" /> List a Vehicle</Button>
          </div>
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center gap-3 rounded-xl border px-2 py-2">
                <VehicleImage src={vehicle.images[0]} alt="" className="h-12 w-16 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{vehicle.name}</p>
                  <p className="text-xs text-muted">{vehicle.category} · {vehicle.seats} Seater</p>
                </div>
                <StatusBadge value={operational(vehicle, bookings, data.maintenance, today)} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-bold">Vehicle Rental Calendar</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <MiniCalendar marked={markedDays(bookings)} onPick={setDay} />
            <div className="space-y-2 text-sm">
              <p className="font-bold">Schedule on {formatPretty(day)}</p>
              {bookings.filter((booking) => booking.pickupDate <= day && day < booking.returnDate).map((booking) => {
                const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId)
                return <p key={booking.id}>{vehicle?.name} · <StatusBadge value={booking.status} /></p>
              })}
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Recent Reservations</h2>
            <button className="text-xs font-bold text-info" onClick={() => navigate('/partner/reservations')}>View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted"><tr><th>Booking No.</th><th>Vehicle</th><th>Rental Period</th><th>Your commission ({PARTNER_COMMISSION_PERCENT}%)</th><th>Status</th></tr></thead>
              <tbody>
                {[...bookings].sort((a, b) => b.reference.localeCompare(a.reference)).slice(0, 5).map((booking) => {
                  const vehicle = data.vehicles.find((item) => item.id === booking.vehicleId)
                  const share = shareAmount(booking, vehicle, data.users, data.settings, viewer)
                  return (
                    <tr key={booking.id} className="border-t">
                      <td className="py-2 font-semibold">{booking.reference}</td>
                      <td>{vehicle?.model}</td>
                      <td>{formatPretty(booking.pickupDate)} – {formatPretty(booking.returnDate)}</td>
                      <td className="font-semibold text-success">{formatPeso(share)}</td>
                      <td><StatusBadge value={booking.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-bold">Earnings Overview</h2>
          <p className="text-3xl font-extrabold">{formatPeso(earningsTotalValue)}</p>
          <p className={cn('text-xs font-semibold', earningsDelta >= 0 ? 'text-success' : 'text-danger')}>{earningsDelta >= 0 ? '+' : ''}{earningsDelta}% vs. previous 30 days</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#ffc400" radius={6} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function CustomerHome() {
  const session = useSession()
  const { data } = useSnapshot()
  const navigate = useNavigate()
  if (!data || !session) return null
  const mine = data.bookings.filter((booking) => booking.customerId === session.id)
  const upcoming = mine.filter((booking) => ['pending', 'confirmed', 'ongoing'].includes(booking.status)).sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))[0]
  const vehicle = data.vehicles.find((item) => item.id === upcoming?.vehicleId)
  const favorites = data.vehicles.filter((item) => data.favorites.some((favorite) => favorite.userId === session.id && favorite.vehicleId === item.id))
  const spent = mine.filter((booking) => booking.paymentStatus === 'paid').reduce((sum, booking) => sum + booking.pricing.total, 0)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Upcoming Bookings" value={String(mine.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed').length)} delta={0} icon={CalendarDays} tone="bg-blue-100 text-info" />
        <Kpi label="Active Rentals" value={String(mine.filter((booking) => booking.status === 'ongoing').length)} delta={0} icon={CarFront} tone="bg-emerald-100 text-success" />
        <Kpi label="Completed Rentals" value={String(mine.filter((booking) => booking.status === 'completed').length)} delta={0} icon={Clock3} tone="bg-amber-100 text-amber-600" />
        <Kpi label="Total Spent" value={formatPeso(spent)} delta={0} icon={Coins} tone="bg-violet-100 text-violet-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-bold">Upcoming rental</h2>
          {upcoming && vehicle ? (
            <div className="mt-3 flex gap-3">
              <VehicleImage src={vehicle.images[0]} alt="" className="h-24 w-32 rounded-xl" />
              <div>
                <p className="font-bold">{vehicle.name}</p>
                <p className="text-sm text-muted">{formatPretty(upcoming.pickupDate)} – {formatPretty(upcoming.returnDate)}</p>
                <StatusBadge value={upcoming.status} />
                <p className="mt-1 font-bold">{formatPeso(upcoming.pricing.total)}</p>
                <Button size="sm" className="mt-2" onClick={() => navigate('/customer/bookings')}>View Booking Details</Button>
              </div>
            </div>
          ) : <p className="mt-3 text-sm text-muted">No upcoming rental yet.</p>}
        </Panel>
        <Panel>
          <h2 className="font-bold">Favorite vehicles</h2>
          <div className="mt-3 space-y-2">
            {favorites.length === 0 ? <p className="text-sm text-muted">Save a vehicle from Available Cars.</p> : favorites.map((item) => (
              <button key={item.id} className="flex w-full items-center gap-3 text-left" onClick={() => navigate(`/cars/${item.id}`)}>
                <VehicleImage src={item.images[0]} alt="" className="h-12 w-16 rounded-lg" />
                <span className="font-semibold">{item.name}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function PartnerCommissionCard({ package: rates }: { package: RentalPackage }) {
  return (
    <Panel>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-canvas text-navy">
        <Tags className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm text-muted">Your commission</p>
      <p className="mt-1 text-2xl font-extrabold text-success">{PARTNER_COMMISSION_PERCENT}%</p>
      <p className="mt-1 text-xs text-muted">Of each booking total when the rental is completed (same quote the customer confirmed).</p>
      <p className="mt-3 text-sm text-muted">Customer rates (admin)</p>
      <ul className="mt-2 space-y-1 text-sm">
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">1 day</span>
          <span className="font-extrabold text-ink">{formatPeso(rates.rateFirstDay)}</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">2–5 days</span>
          <span className="font-extrabold text-ink">{formatPeso(rates.rateSucceeding)}</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">10+ days</span>
          <span className="font-extrabold text-ink">{formatPeso(rates.rate10Days)}</span>
        </li>
      </ul>
    </Panel>
  )
}

function Kpi({ label, value, delta, icon: Icon, tone, hint }: { label: string; value: string; delta: number; icon: typeof CarFront; tone: string; hint?: string }) {
  return (
    <Panel className="relative overflow-hidden">
      <span className={cn('grid h-10 w-10 place-items-center rounded-xl', tone)}><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-sm text-muted">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : <p className={cn('text-xs font-semibold', delta >= 0 ? 'text-success' : 'text-danger')}>{delta >= 0 ? '+' : ''}{delta}% vs. last 30 days</p>}
    </Panel>
  )
}

function BookingLine({ booking, vehicles, users }: { booking: Booking; vehicles: Vehicle[]; users: { id: string; name: string }[] }) {
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId)
  return (
    <div className="flex items-center gap-2 text-sm">
      <VehicleImage src={vehicle?.images[0]} alt="" className="h-10 w-14 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{vehicle?.name}</p>
        <p className="text-xs text-muted">{formatTime(booking.pickupTime)} · {formatPretty(booking.pickupDate)}</p>
      </div>
      <StatusBadge value={booking.status} />
    </div>
  )
}

function RecentTable({ bookings, vehicles, users, onOpen }: { bookings: Booking[]; vehicles: Vehicle[]; users: { id: string; name: string }[]; onOpen: (id: string) => void }) {
  if (bookings.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No bookings yet. Reset leaves an empty walkthrough—create one from Quick Actions or the public site.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="text-xs text-muted"><tr><th>Booking No.</th><th>Customer</th><th>Vehicle</th><th>Rental Period</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {bookings.map((booking) => {
            const vehicle = vehicles.find((item) => item.id === booking.vehicleId)
            const customer = users.find((user) => user.id === booking.customerId)
            return (
              <tr key={booking.id} className="border-t">
                <td className="py-2 font-semibold">{booking.reference}</td>
                <td>{customer?.name}</td>
                <td>{vehicle?.name}</td>
                <td>{formatPretty(booking.pickupDate)} – {formatPretty(booking.returnDate)}</td>
                <td>{formatPeso(booking.pricing.total)}</td>
                <td><StatusBadge value={booking.status} /></td>
                <td><button className="text-xs font-bold text-info" onClick={() => onOpen(booking.id)}>View</button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function markedDays(bookings: Booking[]) {
  const dates = new Set<string>()
  bookings.filter((booking) => !['cancelled', 'rejected'].includes(booking.status)).forEach((booking) => {
    eachDate(booking.pickupDate, booking.returnDate).forEach((date) => dates.add(date))
  })
  return dates
}

function operational(vehicle: Vehicle, bookings: Booking[], maintenance: { vehicleId: string; startDate: string; endDate: string }[], today: string) {
  if (vehicle.listingStatus === 'pending') return 'pending'
  if (vehicle.listingStatus === 'rejected') return 'rejected'
  if (!vehicle.listingActive) return 'unavailable'
  if (maintenance.some((item) => item.vehicleId === vehicle.id && item.startDate <= today && today <= item.endDate)) return 'maintenance'
  if (bookings.some((booking) => booking.vehicleId === vehicle.id && ['confirmed', 'ongoing'].includes(booking.status) && booking.pickupDate <= today && today < booking.returnDate)) return 'on_rental'
  return 'available'
}
