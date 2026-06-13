-- Billetera ($KCA) + automatic commissions on order payment.

-- wallets ------------------------------------------------------------------
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_available numeric not null default 0,
  balance_locked numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "wallets_select_own_or_admin" on public.wallets
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

-- backfill a wallet row for every existing profile (new signups get one via
-- the updated handle_new_user trigger added later in this file)
insert into public.wallets (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- wallet_transactions --------------------------------------------------------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  amount numeric not null,
  type text not null check (type in (
    'commission_l1', 'commission_l2', 'commission_l3', 'commission_l4',
    'owner_global', 'unlock', 'purchase_with_balance',
    'withdrawal_request', 'withdrawal_rejected'
  )),
  bucket text not null check (bucket in ('available', 'locked')),
  related_order_id uuid references public.orders (id),
  related_withdrawal_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

create policy "wallet_transactions_select_own_or_admin" on public.wallet_transactions
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

-- withdrawal_requests ---------------------------------------------------------
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  amount numeric not null check (amount > 0),
  destination text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.withdrawal_requests enable row level security;

create policy "withdrawal_requests_select_own_or_admin" on public.withdrawal_requests
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

create policy "withdrawal_requests_insert_own" on public.withdrawal_requests
  for insert with check (user_id = auth.uid());

create policy "withdrawal_requests_update_admin" on public.withdrawal_requests
  for update using (public.is_admin_or_owner());

-- orders: payment reference ----------------------------------------------------
alter table public.orders add column payment_reference text;
