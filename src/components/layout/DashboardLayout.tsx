import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { Bell, ChevronDown, LogOut, Menu, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandLockup } from '@/components/layout/PublicLayout'
import { DEMO_ACCOUNTS } from '@/constants/content'
import { isMockProvider } from '@/lib/config'
import { useDemoActions, useSession, useSnapshot } from '@/hooks/useDemo'
import { homeForRole } from '@/utils/bookingRules'
import { formatManilaStamp } from '@/utils/dates'
import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'

export interface DashLink {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
  children?: { to: string; label: string }[]
}

export function DashboardLayout({
  title,
  subtitle,
  links,
}: {
  title: string
  subtitle: string
  links: DashLink[]
}) {
  const session = useSession()
  const { data } = useSnapshot()
  const actions = useDemoActions()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  const stamp = formatManilaStamp(now)
  const notes = (data?.notifications ?? []).filter((item) => item.userId === session?.id)
  const unread = notes.filter((item) => !item.read).length
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle || !data || !session) return []
    const vehicles = data.vehicles.filter((vehicle) => vehicle.name.toLowerCase().includes(needle)).slice(0, 4)
    const bookings = data.bookings.filter((booking) => booking.reference.toLowerCase().includes(needle)).slice(0, 4)
    const people = data.users.filter((user) => user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)).slice(0, 4)
    return [
      ...vehicles.map((vehicle) => ({
        label: vehicle.name,
        hint: 'Vehicle',
        to: `/${session.role === 'admin' ? 'admin/vehicles' : session.role === 'partner' || session.role === 'owner' ? 'partner/vehicles' : 'cars'}`,
      })),
      ...bookings.map((booking) => ({
        label: booking.reference,
        hint: 'Booking',
        to: `/${session.role === 'customer' ? 'customer/bookings' : session.role === 'partner' || session.role === 'owner' ? 'partner/reservations' : 'admin/bookings'}`,
      })),
      ...people.map((person) => ({ label: person.name, hint: person.role, to: session.role === 'admin' ? '/admin/customers' : homeForRole(session.role) })),
    ]
  }, [data, query, session])

  const sidebar = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="px-4 py-4">
        <BrandLockup />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {links.map((link) => (
          <div key={link.to}>
            <div className="flex items-center">
              <NavLink
                to={link.to}
                end={link.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn('flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80', isActive && 'bg-gold text-ink')}
              >
                <link.icon className="h-4 w-4" />
                <span className="flex-1">{link.label}</span>
                {link.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] text-white">{link.badge}</span> : null}
              </NavLink>
              {link.children ? (
                <button type="button" className="grid h-8 w-8 place-items-center text-white/70" aria-label={`Expand ${link.label}`} onClick={() => setExpanded((value) => (value === link.to ? null : link.to))}>
                  <ChevronDown className={cn('h-4 w-4', expanded === link.to && 'rotate-180')} />
                </button>
              ) : null}
            </div>
            {link.children && expanded === link.to ? (
              <div className="ml-9 mt-1 space-y-1">
                {link.children.map((child) => (
                  <NavLink key={child.to} to={child.to} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-1.5 text-xs font-semibold text-white/70 hover:text-white">
                    {child.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
      <div className="relative mt-3 h-28">
        <img src="/vehicles/mountains.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gold font-bold text-ink">{session?.name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{session?.name}</span>
          <span className="block truncate text-xs text-white/60">{session?.title}</span>
        </span>
        <button type="button" aria-label="Log out" onClick={() => { actions.logout(); navigate('/login') }}><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">{sidebar}</aside>
      {open ? <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)}><div className="h-full w-[248px]" onClick={(event) => event.stopPropagation()}>{sidebar}</div></div> : null}
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[74px] items-center gap-3 bg-navy px-4 text-white">
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-lg font-extrabold">{title}</p>
            <p className="truncate text-xs text-white/65">{subtitle}</p>
          </div>
          <div className="relative ml-auto w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookings, customers, or vehicles..." className="h-10 w-full rounded-full border border-white/10 bg-white/10 pl-9 pr-3 text-sm outline-none placeholder:text-white/50" />
            {results.length ? (
              <div className="absolute left-0 right-0 top-12 rounded-2xl bg-white p-2 text-ink shadow-xl">
                {results.map((result) => (
                  <button key={result.label + result.hint} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-canvas" onClick={() => { setQuery(''); navigate(result.to) }}>
                    <span>{result.label}</span><span className="text-xs text-muted">{result.hint}</span>
                  </button>
                ))}
                <button className="absolute right-2 top-2" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-3 w-3" /></button>
              </div>
            ) : null}
          </div>
          <Dropdown.Root>
            <Dropdown.Trigger className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unread ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" /> : null}
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content className="z-50 w-80 rounded-2xl bg-white p-2 text-ink shadow-xl">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-sm font-bold">Notifications</p>
                  <button className="text-xs font-semibold text-info" onClick={() => actions.markAll()}>Mark all read</button>
                </div>
                {notes.length === 0 ? <p className="px-2 py-4 text-sm text-muted">No notifications yet.</p> : notes.slice(0, 6).map((note) => (
                  <Dropdown.Item key={note.id} className="cursor-pointer rounded-xl px-2 py-2 text-sm outline-none hover:bg-canvas" onSelect={() => { actions.markRead(note.id); if (note.href) navigate(note.href) }}>
                    <span className="font-semibold">{note.title}</span>
                    <span className="block text-xs text-muted">{note.body}</span>
                  </Dropdown.Item>
                ))}
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
          <div className="hidden rounded-2xl border border-white/10 px-3 py-1.5 text-right text-xs sm:block">
            <p className="font-bold">{stamp.date}</p>
            <p className="text-white/70">{stamp.time}</p>
          </div>
          {isMockProvider() ? (
            <Dropdown.Root>
              <Dropdown.Trigger className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-ink">Demo</Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content className="z-50 w-64 rounded-2xl bg-white p-2 text-ink shadow-xl">
                  <p className="px-2 py-1 text-xs font-bold text-muted">Switch demo role</p>
                  {DEMO_ACCOUNTS.map((account) => (
                    <Dropdown.Item
                      key={account.id}
                      className="cursor-pointer rounded-xl px-2 py-2 text-sm outline-none hover:bg-canvas"
                      onSelect={async () => {
                        await actions.login(account.id)
                        const role =
                          account.id === 'user-admin'
                            ? 'admin'
                            : account.id === 'user-partner'
                              ? 'partner'
                              : 'customer'
                        navigate(homeForRole(role))
                      }}
                    >
                      {account.role}
                      <span className="block text-xs text-muted">{account.email}</span>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          ) : null}
        </header>
        <main className="min-w-0 p-4 lg:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl bg-white p-4 shadow-sm', className)}>{children}</section>
}
