import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { BrandLockup } from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/Button'
import { ErrorText, FieldLabel, TextInput } from '@/components/ui/Fields'
import { DEMO_ACCOUNTS } from '@/constants/content'
import { isMockProvider, isSupabaseProvider, supabaseConfigured } from '@/lib/config'
import { useDemoActions } from '@/hooks/useDemo'
import { friendlyErrorMessage } from '@/utils/friendlyError'
import {
  getAuthUserEmailVerified,
  registerCustomer,
  requestPasswordReset,
  resendVerificationEmail,
  signInWithPassword,
  updatePasswordFromRecovery,
} from '@/services/auth/authService'
import { getSupabaseClient } from '@/lib/supabase/client'
import { homeForRole } from '@/utils/bookingRules'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'

const authNavLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/cars', label: 'Available Cars' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/become-a-partner', label: 'Become a Partner' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
] as const

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    address: z.string().min(4),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { message: 'Passwords do not match', path: ['confirm'] })

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Enter your password.'),
})

export function LoginPage() {
  if (isSupabaseProvider()) return <LoginPageSupabase />
  return <LoginPageDemo />
}

export function RegisterPage() {
  if (isSupabaseProvider()) return <RegisterPageSupabase />
  return <RegisterPageDemo />
}

export function ForgotPasswordPage() {
  if (isSupabaseProvider()) return <ForgotPasswordPageSupabase />
  return <ForgotPasswordPageDemo />
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session) {
          toast.error('Verification link is invalid or expired.')
          navigate('/login')
          return
        }
        const verified = await getAuthUserEmailVerified()
        toast.success(verified ? 'Email verified. You can sign in.' : 'Session restored.')
        navigate('/login')
      } catch {
        toast.error('Could not complete verification.')
        navigate('/login')
      }
    }
    void run()
  }, [navigate])
  return <AuthShell><p className="text-sm text-muted">Confirming your email…</p></AuthShell>
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    let cancelled = false

    const finish = (ok: boolean) => {
      if (cancelled) return
      setLinkInvalid(!ok)
      setReady(true)
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        finish(true)
      }
    })

    void (async () => {
      await new Promise((r) => window.setTimeout(r, 400))
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        finish(false)
        return
      }
      finish(true)
    })()

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  const form = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(
      z
        .object({ password: z.string().min(8), confirm: z.string() })
        .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] }),
    ),
  })
  if (!ready) {
    return (
      <AuthShell>
        <p className="text-sm text-muted">Checking your reset link…</p>
      </AuthShell>
    )
  }

  if (linkInvalid) {
    return (
      <AuthShell>
        <h1 className="text-3xl font-extrabold">Reset link expired</h1>
        <p className="mt-2 text-sm text-muted">
          Request a new email from the live site (not localhost). If this keeps happening, ask an admin to fix Supabase
          Auth URL settings.
        </p>
        <Link to="/forgot-password" className="mt-4 inline-block font-bold">
          Send reset email again
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Set new password</h1>
      <form
        className="mt-4 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          setBusy(true)
          try {
            await updatePasswordFromRecovery(values.password)
            toast.success('Password updated. Sign in with your new password.')
            navigate('/login')
          } catch (error) {
            toast.error(friendlyErrorMessage(error, 'account'))
          } finally {
            setBusy(false)
          }
        })}
      >
        <label>
          <FieldLabel required>New password</FieldLabel>
          <TextInput type="password" autoComplete="new-password" {...form.register('password')} />
        </label>
        <label>
          <FieldLabel required>Confirm password</FieldLabel>
          <TextInput type="password" autoComplete="new-password" {...form.register('confirm')} />
        </label>
        <ErrorText>{form.formState.errors.password?.message ?? form.formState.errors.confirm?.message}</ErrorText>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}

export function VerifyEmailNoticePage() {
  const [email, setEmail] = useState('')
  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Verify your email</h1>
      <p className="mt-2 text-sm text-muted">Resend the confirmation message if it expired or did not arrive.</p>
      <div className="mt-4 space-y-3">
        <TextInput placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button
          onClick={async () => {
            try {
              await resendVerificationEmail(email)
              toast.success('If the account exists, a new verification email was sent.')
            } catch (error) {
              toast.error(friendlyErrorMessage(error, 'account'))
            }
          }}
        >
          Resend verification
        </Button>
        <Link to="/login" className="inline-block text-sm font-bold">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  )
}

function LoginPageDemo() {
  const actions = useDemoActions()
  const navigate = useNavigate()
  return (
    <AuthShell demo>
      <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Demo mode — not production security</p>
      <h1 className="mt-3 text-3xl font-extrabold">Choose a demo desk</h1>
      <p className="mt-2 text-sm text-muted">No password is checked. Pick a role to open its dashboard.</p>
      <div className="mt-5 space-y-3">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.id}
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left hover:border-gold"
            onClick={async () => {
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
            <span>
              <span className="block font-bold">{account.role}</span>
              <span className="text-sm text-muted">{account.email}</span>
            </span>
            <span className="text-xs font-semibold text-muted">{account.blurb}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm">
        New customer?{' '}
        <Link to="/register" className="font-bold">
          Create a demo profile
        </Link>
      </p>
      <p className="text-sm">
        <Link to="/forgot-password" className="font-bold">
          Forgot password
        </Link>
      </p>
    </AuthShell>
  )
}

function LoginPageSupabase() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  const misconfigured = !supabaseConfigured()

  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Use your Drive Moko account. You will be sent to the dashboard for your role.</p>
      {misconfigured ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Supabase is not configured. Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to <code className="text-xs">.env.local</code>.
        </p>
      ) : null}
      <form
        className="mt-4 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          if (misconfigured) return
          setBusy(true)
          try {
            const user = await signInWithPassword(values.email, values.password)
            toast.success(`Welcome back, ${user.name.split(' ')[0]}.`)
            navigate(homeForRole(user.role))
          } catch (error) {
            toast.error(friendlyErrorMessage(error, 'account'))
          } finally {
            setBusy(false)
          }
        })}
      >
        <label>
          <FieldLabel required>Email</FieldLabel>
          <TextInput autoComplete="email" {...form.register('email')} />
        </label>
        <label>
          <FieldLabel required>Password</FieldLabel>
          <TextInput type="password" autoComplete="current-password" {...form.register('password')} />
        </label>
        <ErrorText>{form.formState.errors.email?.message ?? form.formState.errors.password?.message}</ErrorText>
        <Button type="submit" className="mt-1 w-full" disabled={busy || misconfigured}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        New customer?{' '}
        <Link to="/register" className="font-bold">
          Create an account
        </Link>
      </p>
      <p className="text-sm">
        <Link to="/forgot-password" className="font-bold">
          Forgot password
        </Link>
      </p>
      {isMockProvider() ? null : (
        <p className="mt-3 text-xs text-muted">Staff (admin, partner) accounts are created by Drive Moko. Public sign-up is for customers only.</p>
      )}
    </AuthShell>
  )
}

function RegisterPageDemo() {
  const actions = useDemoActions()
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { password: '', confirm: '' },
  })
  return (
    <AuthShell demo>
      <h1 className="text-3xl font-extrabold">Create a customer profile</h1>
      <p className="mt-2 text-sm text-muted">Demo registration — password is not stored.</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          const user = await actions.registerCustomer({
            role: 'customer',
            name: values.name,
            email: values.email,
            phone: values.phone,
            address: values.address,
          })
          if (!user) return
          await actions.login(user.id)
          navigate('/customer')
        })}
      >
        <label className="block">
          <FieldLabel required>Full name</FieldLabel>
          <TextInput {...form.register('name')} />
        </label>
        <label className="block">
          <FieldLabel required>Email</FieldLabel>
          <TextInput {...form.register('email')} />
        </label>
        <label className="block">
          <FieldLabel required>Phone</FieldLabel>
          <TextInput {...form.register('phone')} />
        </label>
        <label className="block">
          <FieldLabel required>Address</FieldLabel>
          <TextInput {...form.register('address')} />
        </label>
        <label className="block">
          <FieldLabel required>Password</FieldLabel>
          <TextInput type="password" {...form.register('password')} />
        </label>
        <label className="block">
          <FieldLabel required>Confirm password</FieldLabel>
          <TextInput type="password" {...form.register('confirm')} />
        </label>
        <div className="space-y-2">
          {Object.values(form.formState.errors).map((error) => (
            <ErrorText key={error?.message}>{error?.message}</ErrorText>
          ))}
        </div>
        <Button type="submit" className="mt-2 w-full">
          Create demo customer
        </Button>
      </form>
      <p className="mt-5 text-sm">
        <Link to="/login" className="font-bold">
          Back to login
        </Link>
      </p>
    </AuthShell>
  )
}

function RegisterPageSupabase() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const form = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) })
  const misconfigured = !supabaseConfigured()

  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Register as a customer to book vehicles and track reservations.</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          if (misconfigured) return
          setBusy(true)
          try {
            const result = await registerCustomer({
              name: values.name,
              email: values.email,
              phone: values.phone,
              address: values.address,
              password: values.password,
            })
            if (result.needsEmailConfirmation) {
              toast.message('Check your email to confirm your account, then sign in.')
              navigate('/auth/verify')
              return
            }
            if (result.user) {
              toast.success('Account created.')
              navigate(homeForRole(result.user.role))
            }
          } catch (error) {
            toast.error(friendlyErrorMessage(error, 'account'))
          } finally {
            setBusy(false)
          }
        })}
      >
        <label className="block">
          <FieldLabel required>Full name</FieldLabel>
          <TextInput {...form.register('name')} />
        </label>
        <label className="block">
          <FieldLabel required>Email</FieldLabel>
          <TextInput autoComplete="email" {...form.register('email')} />
        </label>
        <label className="block">
          <FieldLabel required>Phone</FieldLabel>
          <TextInput {...form.register('phone')} />
        </label>
        <label className="block">
          <FieldLabel required>Address</FieldLabel>
          <TextInput {...form.register('address')} />
        </label>
        <label className="block">
          <FieldLabel required>Password</FieldLabel>
          <TextInput type="password" autoComplete="new-password" {...form.register('password')} />
        </label>
        <label className="block">
          <FieldLabel required>Confirm password</FieldLabel>
          <TextInput type="password" autoComplete="new-password" {...form.register('confirm')} />
        </label>
        <div className="space-y-2">
          {Object.values(form.formState.errors).map((error) => (
            <ErrorText key={error?.message}>{error?.message}</ErrorText>
          ))}
        </div>
        <Button type="submit" className="mt-2 w-full" disabled={busy || misconfigured}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-5 text-sm">
        <Link to="/login" className="font-bold">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

function ForgotPasswordPageDemo() {
  const form = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().email() })) })
  return (
    <AuthShell demo>
      <h1 className="text-3xl font-extrabold">Reset access</h1>
      <p className="mt-2 text-sm text-muted">Demo mode does not send email.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={form.handleSubmit(() => toast.message('No email was sent. Open the demo login and pick a role.'))}
      >
        <label>
          <FieldLabel required>Email</FieldLabel>
          <TextInput {...form.register('email')} />
        </label>
        <ErrorText>{form.formState.errors.email?.message}</ErrorText>
        <Button type="submit">Show demo reminder</Button>
      </form>
      <Link to="/login" className="mt-4 inline-block text-sm font-bold">
        Return to login
      </Link>
    </AuthShell>
  )
}

function ForgotPasswordPageSupabase() {
  const [busy, setBusy] = useState(false)
  const form = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().email() })) })
  return (
    <AuthShell>
      <h1 className="text-3xl font-extrabold">Reset password</h1>
      <p className="mt-2 text-sm text-muted">We will email you a link to choose a new password.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          setBusy(true)
          try {
            await requestPasswordReset(values.email)
            toast.success('If that email is registered, you will receive reset instructions.')
          } catch (error) {
            toast.error(friendlyErrorMessage(error, 'account'))
          } finally {
            setBusy(false)
          }
        })}
      >
        <label>
          <FieldLabel required>Email</FieldLabel>
          <TextInput autoComplete="email" {...form.register('email')} />
        </label>
        <ErrorText>{form.formState.errors.email?.message}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <Link to="/login" className="mt-4 inline-block text-sm font-bold">
        Return to sign in
      </Link>
    </AuthShell>
  )
}

function AuthShell({ children, demo }: { children: React.ReactNode; demo?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy text-white lg:block">
        <img src="/vehicles/mountains.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <BrandLockup />
              <nav
                className="flex max-w-[62%] flex-wrap justify-end gap-x-4 gap-y-2 text-right text-sm"
                aria-label="Site navigation"
              >
                {authNavLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'font-semibold text-white/85 transition hover:text-gold',
                        isActive && 'text-gold underline decoration-gold decoration-2 underline-offset-4',
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Go back to home
            </Link>
          </div>
          <div>
            <p className="text-4xl font-black italic">
              Susi Mo Sa <span className="text-gold">Masayang Biyahe!</span>
            </p>
            <p className="mt-3 max-w-sm text-white/80">
              {demo
                ? 'A demonstration of the Drive Moko rental desk.'
                : 'Secure sign-in for Drive Moko customers and team members.'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center bg-canvas px-4 py-10">
        <nav
          className="mb-3 flex max-w-md flex-wrap justify-center gap-x-3 gap-y-2 text-center text-xs font-semibold text-navy lg:hidden"
          aria-label="Site navigation"
        >
          {authNavLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => cn('hover:text-gold', isActive && 'text-gold')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Go back to home
        </Link>
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}