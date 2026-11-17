import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { CalendarPlus, ChevronDown, Menu, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { BRAND } from '@/constants/content'
import { useDemoActions, useSession } from '@/hooks/useDemo'
import { homeForRole } from '@/utils/bookingRules'
import { cn } from '@/utils/cn'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/cars', label: 'Available Cars' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/become-a-partner', label: 'Become a Partner' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
]

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const session = useSession()
  const actions = useDemoActions()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-40 bg-navy text-white">
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center gap-4 px-4 lg:px-6">
          <NavLink to="/" className="shrink-0" onClick={() => setOpen(false)}>
            <BrandLockup />
          </NavLink>
          <nav className="ml-6 hidden flex-1 items-center justify-center gap-6 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => cn('relative py-2 text-sm font-medium text-white/90 hover:text-white', isActive && 'font-semibold text-gold')}
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive ? <span className="absolute -bottom-0.5 left-0 right-0 mx-auto h-0.5 w-8 rounded bg-gold" /> : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {session ? (
              <>
                <Link
                  to={homeForRole(session.role)}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white bg-white px-4 py-2 text-sm font-bold text-navy shadow-md hover:bg-gold hover:border-gold"
                >
                  <UserRound className="h-4 w-4" />
                  Dashboard
                </Link>
                <Dropdown.Root>
                  <Dropdown.Trigger className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25">
                    {session.name.split(' ')[0]}
                    <ChevronDown className="h-4 w-4" />
                  </Dropdown.Trigger>
                  <Dropdown.Portal>
                    <Dropdown.Content className="z-50 min-w-44 rounded-xl bg-white p-1 text-ink shadow-xl">
                      <Dropdown.Item
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-canvas"
                        onSelect={() => navigate(homeForRole(session.role))}
                      >
                        Open dashboard
                      </Dropdown.Item>
                      <Dropdown.Item className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-canvas" onSelect={() => actions.logout()}>
                        Log out
                      </Dropdown.Item>
                    </Dropdown.Content>
                  </Dropdown.Portal>
                </Dropdown.Root>
              </>
            ) : (
              <NavLink to="/login" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-navy-2 px-4 py-2 text-sm font-semibold">
                <UserRound className="h-4 w-4" />
                Login
              </NavLink>
            )}
            <Link to="/cars" className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink hover:bg-gold-2">
              <CalendarPlus className="h-4 w-4" />
              Book a Car
            </Link>
          </div>
          <button className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open ? (
          <div className="space-y-1 border-t border-white/10 px-4 py-3 lg:hidden">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold">
                {link.label}
              </NavLink>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                className={session ? 'bg-white font-bold text-navy hover:bg-gold' : undefined}
                variant={session ? 'primary' : 'outline'}
                onClick={() => {
                  setOpen(false)
                  navigate(session ? homeForRole(session.role) : '/login')
                }}
              >
                {session ? 'Dashboard' : 'Login'}
              </Button>
              <Button onClick={() => { setOpen(false); navigate('/cars') }}>Book a Car</Button>
            </div>
          </div>
        ) : null}
      </header>
      <Outlet />
      <footer className="bg-navy text-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 md:grid-cols-4 lg:px-6">
          <div>
            <BrandLockup />
            <p className="mt-4 text-sm leading-6 text-white/70">{BRAND.tagline} {BRAND.support}</p>
          </div>
          <div>
            <p className="font-bold">Explore</p>
            <div className="mt-3 space-y-2 text-sm text-white/75">
              <NavLink to="/cars" className="block">Available Cars</NavLink>
              <NavLink to="/how-it-works" className="block">How It Works</NavLink>
              <NavLink to="/become-a-partner" className="block">Become a Partner</NavLink>
            </div>
          </div>
          <div>
            <p className="font-bold">Company</p>
            <div className="mt-3 space-y-2 text-sm text-white/75">
              <p>{BRAND.company}</p>
              <NavLink to="/about" className="block">About Us</NavLink>
              <NavLink to="/contact" className="block">Contact</NavLink>
            </div>
          </div>
          <div>
            <p className="font-bold">Support</p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              For booking questions and fleet availability, contact Drive Moko during business hours. Rates and availability on this site reflect live inventory when connected to production.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">© {new Date().getFullYear()} {BRAND.name} · {BRAND.company}. {BRAND.place}</div>
      </footer>
    </div>
  )
}

export function BrandLockup({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo.jpg" alt="Drive Moko logo" className="h-12 w-12 rounded-full bg-white object-cover" />
      <span className={cn('leading-tight', dark ? 'text-ink' : 'text-white')}>
        <span className="block text-sm font-extrabold tracking-[0.08em]">DRIVE MOKO</span>
        <span className={cn('block text-[11px]', dark ? 'text-muted' : 'text-white/75')}>Car Rentals</span>
        <span className={cn('block text-[11px]', dark ? 'text-muted' : 'text-white/75')}>Nueva Vizcaya</span>
      </span>
    </span>
  )
}
