-- Drive Moko — 027 lump-sum partner disbursements (admin-recorded payouts)
create table if not exists public.partner_disbursements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles (id) on delete cascade,
  amount_centavos bigint not null check (amount_centavos > 0),
  payout_reference text not null default '',
  method text not null default 'gcash'
    check (method in ('cash', 'gcash', 'maya', 'bank')),
  paid_at timestamptz not null default now(),
  paid_by uuid references public.profiles (id),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists partner_disbursements_partner_idx
  on public.partner_disbursements (partner_id, paid_at desc);

alter table public.partner_disbursements enable row level security;

create policy partner_disbursements_admin_all on public.partner_disbursements
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy partner_disbursements_partner_read on public.partner_disbursements
  for select
  using (partner_id = auth.uid());

select count(*) as partner_disbursements_table from public.partner_disbursements;