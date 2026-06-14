-- 0011_loyalty_points.sql -------------------------------------------------
-- Separación de saldos: puntos de fidelización (no son dinero, se canjean
-- por catálogo) + tablas de soporte para canjes y cupones.

alter table public.wallets
  add column loyalty_points_balance integer not null default 0;

-- Historial de canjes (qué premio del catálogo canjeó cada usuario)
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  reward_code text not null,
  points_spent integer not null,
  created_at timestamptz not null default now()
);

create index reward_redemptions_user_idx on public.reward_redemptions (user_id, created_at desc);

alter table public.reward_redemptions enable row level security;

create policy "reward_redemptions_select_own_or_admin" on public.reward_redemptions
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

-- Cupones pendientes de usar (descuentos canjeados, aplicables a la
-- siguiente compra)
create table public.reward_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  discount_amount numeric not null,
  status text not null default 'available' check (status in ('available', 'used')),
  source_reward_code text not null,
  used_order_id uuid references public.orders (id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index reward_vouchers_user_idx on public.reward_vouchers (user_id, status);

alter table public.reward_vouchers enable row level security;

create policy "reward_vouchers_select_own_or_admin" on public.reward_vouchers
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );
