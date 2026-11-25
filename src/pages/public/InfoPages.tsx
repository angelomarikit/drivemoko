import * as Accordion from '@radix-ui/react-accordion'
import { zodResolver } from '@hookform/resolvers/zod'
import { BadgePercent, Check, ChevronDown, Handshake, Headset, Send, ShieldCheck, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { ErrorText, FieldLabel, SelectInput, TextArea, TextInput } from '@/components/ui/Fields'
import { BRAND, FAQS, REQUIREMENTS } from '@/constants/content'
import { useDemoActions } from '@/hooks/useDemo'
import { PARTNER_COMMISSION_PERCENT } from '@/utils/partnerShare'

const partnerSchema = z.object({
  fullName: z.string().min(2, 'Enter your name'),
  phone: z.string().min(10, 'Enter a contact number'),
  email: z.string().email('Enter a valid email'),
  address: z.string().min(4, 'Enter an address'),
  vehicleDetails: z.string().min(3, 'Describe the vehicle'),
  ownershipType: z.enum(['owned', 'financed', 'fleet']),
  vehicleCount: z.coerce.number().min(1, 'Enter at least 1'),
  notes: z.string().optional(),
})

const PARTNER_BENEFITS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: 'Trusted & secured',
    body: 'Your vehicle appears on the Drive Moko desk with confirmed reservations and clear renter details.',
    icon: ShieldCheck,
  },
  {
    title: 'More bookings',
    body: 'Travelers searching Nueva Vizcaya and nearby routes can request your vehicle once it is approved.',
    icon: TrendingUp,
  },
  {
    title: 'Clear earnings',
    body: `You earn ${PARTNER_COMMISSION_PERCENT}% of each booking total—one simple partner commission, no per-link setup.`,
    icon: BadgePercent,
  },
  {
    title: 'Dedicated support',
    body: 'Our admin team reviews applications, verifies listings, and helps you go live on the public catalog.',
    icon: Headset,
  },
]

const PARTNER_STEPS = [
  { title: 'Submit application', body: 'Tell us about you, your vehicle, and how many units you want to list.' },
  { title: 'Vehicle verification', body: 'We review details and coordinate anything needed before listing.' },
  { title: 'Get listed', body: 'After approval, your car shows on Available Cars with your rental packages.' },
  { title: 'Start earning', body: `Completed rentals accrue your ${PARTNER_COMMISSION_PERCENT}% partner commission on the booking total.` },
]

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  message: z.string().min(8, 'Tell us a bit more'),
})

export function HowItWorksPage() {
  return (
    <div className="bg-canvas">
      <PageHero title="How It Works" text="Search, book, get confirmed, then drive." />
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-10 md:grid-cols-4">
        {['Search & Choose', 'Book Online', 'Get Confirmed', 'Drive & Enjoy'].map((title, index) => (
          <article key={title} className="rounded-3xl bg-white p-5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold font-extrabold">{index + 1}</span>
            <h2 className="mt-3 font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{['Pick a vehicle and dates.', 'Add renter details and review the total.', 'Wait for Drive Moko to confirm the request.', 'Pick up on the confirmed schedule.'][index]}</p>
          </article>
        ))}
      </div>
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 pb-10 md:grid-cols-2">
        {REQUIREMENTS.map((item) => (
          <article key={item.title} className="rounded-3xl bg-white p-5">
            <h2 className="font-bold">{item.title}</h2>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </div>
      <FaqBlock />
    </div>
  )
}

export function PartnerPage() {
  const actions = useDemoActions()
  const form = useForm<z.infer<typeof partnerSchema>>({ resolver: zodResolver(partnerSchema), defaultValues: { ownershipType: 'owned', vehicleCount: 1 } })
  return (
    <div className="bg-canvas pb-12">
      <section className="relative min-h-[560px] overflow-hidden bg-navy text-white">
        <img src="/vehicles/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/30" />
        <div className="relative mx-auto grid max-w-[1440px] items-start gap-6 px-4 py-12 pb-16 lg:grid-cols-[1.1fr_420px] lg:pb-20">
          <div>
            <h1 className="max-w-xl text-5xl font-black italic leading-tight">Become a Drive Moko <span className="text-gold">Partner</span></h1>
            <p className="mt-4 max-w-md text-white/85">Own a car and want to earn more? List your vehicle with Drive Moko and let it work for you!</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {['Earn extra income', 'We handle bookings', 'Grow your fleet'].map((item) => (
                <li key={item} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-semibold text-white/95 backdrop-blur-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <form
            className="rounded-3xl bg-white p-5 text-ink shadow-xl"
            onSubmit={form.handleSubmit(async (values) => {
              await actions.submitApplication({ ...values, notes: values.notes ?? '' })
              form.reset({ ownershipType: 'owned', vehicleCount: 1 })
            })}
          >
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><Handshake className="h-5 w-5" /> Partner With Us</h2>
            <p className="mb-3 text-sm text-muted">Submit the form and our team will review your partner application.</p>
            <div className="space-y-3">
              <label><FieldLabel required>Full Name</FieldLabel><TextInput {...form.register('fullName')} placeholder="Enter your full name" /></label>
              <label><FieldLabel required>Contact Number</FieldLabel><TextInput {...form.register('phone')} placeholder="e.g. 09XX XXX XXXX" /></label>
              <label><FieldLabel required>Email Address</FieldLabel><TextInput {...form.register('email')} placeholder="Enter your email" /></label>
              <label><FieldLabel required>Address</FieldLabel><TextInput {...form.register('address')} placeholder="Town in Nueva Vizcaya" /></label>
              <label><FieldLabel required>Vehicle Details</FieldLabel><TextInput {...form.register('vehicleDetails')} placeholder="e.g. Toyota Vios 2023, 5 Seater" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label><FieldLabel>Ownership</FieldLabel>
                  <SelectInput {...form.register('ownershipType')}>
                    <option value="owned">Owned</option>
                    <option value="financed">Financed</option>
                    <option value="fleet">Fleet</option>
                  </SelectInput>
                </label>
                <label><FieldLabel>Vehicles</FieldLabel><TextInput type="number" min={1} {...form.register('vehicleCount')} /></label>
              </div>
              <label><FieldLabel>Message / Additional Info</FieldLabel><TextArea {...form.register('notes')} placeholder="Tell us more about your vehicle(s)..." /></label>
              {Object.values(form.formState.errors).map((error) => <ErrorText key={error?.message}>{error?.message}</ErrorText>)}
              <Button className="w-full" type="submit"><Send className="h-4 w-4" /> Submit Partner Application</Button>
            </div>
          </form>
        </div>
      </section>

      <section className="relative z-10 -mt-10 px-4 lg:-mt-14">
        <div className="mx-auto max-w-[1440px] rounded-3xl border border-black/5 bg-white p-6 shadow-lg md:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold text-ink md:text-3xl">Why Partner with Drive Moko?</h2>
            <p className="mt-2 text-sm text-muted md:text-base">List with a local desk travelers already trust—clear reservations, fair commission, and admin support from application to go-live.</p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PARTNER_BENEFITS.map(({ title, body, icon: Icon }) => (
              <li key={title} className="flex h-full flex-col rounded-2xl bg-canvas p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-extrabold text-ink">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-[1440px] px-4">
        <div className="overflow-hidden rounded-3xl bg-navy p-6 text-white md:p-10">
          <h2 className="text-2xl font-extrabold md:text-3xl">How to Become a Partner</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/75">Four steps from application to your first booking.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_STEPS.map(({ title, body }, index) => (
              <li key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-sm font-extrabold text-navy">{index + 1}</span>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}

export function AboutPage() {
  return (
    <div>
      <PageHero title="About Drive Moko" text={`${BRAND.company}. ${BRAND.tagline}`} />
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <img src="/cover.jpg" alt="Drive Moko brand artwork" className="w-full rounded-3xl bg-canvas object-contain" />
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold">Company introduction</h2>
          <p className="text-sm leading-7 text-muted">Drive Moko Car Rentals is the rental desk of {BRAND.company} for trips around Nueva Vizcaya and nearby provinces.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl bg-canvas p-4"><h3 className="font-bold">Mission</h3><p className="mt-1 text-sm text-muted">Make local car rental easy to book, confirm, and track.</p></article>
            <article className="rounded-2xl bg-canvas p-4"><h3 className="font-bold">Vision</h3><p className="mt-1 text-sm text-muted">A trusted Nueva Vizcaya fleet shared by owners, partners, and travelers.</p></article>
          </div>
          <ul className="space-y-2 text-sm">{['Self-drive and with-driver options', 'Owner and partner vehicles in one calendar', 'Manual payment checks before a trip is treated as paid'].map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 text-success" /> {item}</li>)}</ul>
        </div>
      </div>
    </div>
  )
}

export function ContactPage() {
  const actions = useDemoActions()
  const form = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema) })
  return (
    <div className="bg-canvas">
      <PageHero title="Contact Us" text="Reach the Drive Moko team for bookings, fleet, and partnerships." />
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-3xl bg-navy p-6 text-white">
          <h2 className="text-xl font-bold">Reach the desk</h2>
          <dl className="mt-4 space-y-3 text-sm text-white/80">
            <div><dt className="font-bold text-white">Phone</dt><dd>Placeholder — official number not provided</dd></div>
            <div><dt className="font-bold text-white">Address</dt><dd>Placeholder — office address not provided. Service area: Nueva Vizcaya.</dd></div>
            <div><dt className="font-bold text-white">Email</dt><dd>hello@drivemoko.com</dd></div>
            <div><dt className="font-bold text-white">Social</dt><dd>Follow Drive Moko on Facebook and Messenger for updates.</dd></div>
          </dl>
        </aside>
        <form className="rounded-3xl bg-white p-6" onSubmit={form.handleSubmit(async (values) => { await actions.inquiry(values); form.reset() })}>
          <div className="grid gap-3 md:grid-cols-2">
            <label><FieldLabel required>Name</FieldLabel><TextInput {...form.register('name')} /></label>
            <label><FieldLabel required>Email</FieldLabel><TextInput {...form.register('email')} /></label>
            <label className="md:col-span-2"><FieldLabel required>Phone</FieldLabel><TextInput {...form.register('phone')} /></label>
            <label className="md:col-span-2"><FieldLabel required>Message</FieldLabel><TextArea {...form.register('message')} /></label>
          </div>
          {Object.values(form.formState.errors).map((error) => <ErrorText key={error?.message}>{error?.message}</ErrorText>)}
          <Button className="mt-4" type="submit">Send inquiry</Button>
        </form>
      </div>
      <FaqBlock />
    </div>
  )
}

function PageHero({ title, text }: { title: string; text: string }) {
  return (
    <section className="relative h-48 overflow-hidden bg-navy text-white">
      <img src="/vehicles/mountains.jpg" alt="" className="h-full w-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-navy/60" />
      <div className="absolute inset-0 mx-auto flex max-w-[1440px] flex-col justify-center px-4">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/80">{text}</p>
      </div>
    </section>
  )
}

function FaqBlock() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <h2 className="mb-3 text-2xl font-extrabold">Questions</h2>
      <Accordion.Root type="single" collapsible className="space-y-2">
        {FAQS.map((faq) => (
          <Accordion.Item key={faq.q} value={faq.q} className="rounded-2xl bg-white">
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold">{faq.q}<ChevronDown className="h-4 w-4" /></Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 pb-3 text-sm text-muted">{faq.a}</Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  )
}
