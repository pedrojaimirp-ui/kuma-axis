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

-- redefine handle_new_user to also create a wallet row on signup ------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  referred_by_id uuid;
begin
  begin
    referred_by_id := (new.raw_user_meta_data->>'referred_by')::uuid;
  exception when invalid_text_representation then
    referred_by_id := null;
  end;

  insert into public.profiles (id, full_name, phone, referral_code, referred_by, terms_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'referral_code',
    referred_by_id,
    now()
  );

  insert into public.wallets (user_id) values (new.id);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- a user is "active" once they've ever had a paid order. The platform owner
-- is always considered active (exempt from locking).
create function public.is_active(p_user_id uuid)
returns boolean as $$
  select
    (select role from public.profiles where id = p_user_id) = 'owner'
    or exists (
      select 1 from public.orders
      where user_id = p_user_id and status = 'paid'
    );
$$ language sql security definer stable set search_path = public;

grant execute on function public.is_active(uuid) to authenticated;

-- credits amount to a user's wallet: 'available' bucket if active,
-- otherwise 'locked'. Records the movement in wallet_transactions.
create function public.credit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_related_order_id uuid,
  p_description text
)
returns void as $$
declare
  v_bucket text;
begin
  if p_user_id is null or p_amount = 0 then
    return;
  end if;

  if public.is_active(p_user_id) then
    v_bucket := 'available';
    update public.wallets
      set balance_available = balance_available + p_amount, updated_at = now()
      where user_id = p_user_id;
  else
    v_bucket := 'locked';
    update public.wallets
      set balance_locked = balance_locked + p_amount, updated_at = now()
      where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, amount, type, bucket, related_order_id, description)
  values (p_user_id, p_amount, p_type, v_bucket, p_related_order_id, p_description);
end;
$$ language plpgsql security definer set search_path = public;

-- when an order becomes 'paid', split commissions across the referral chain
-- (levels 1-4) plus the owner's global percentage.
create function public.handle_order_paid()
returns trigger as $$
declare
  v_commissions jsonb;
  v_price numeric;
  v_owner_percent numeric;
  v_owner_id uuid;
  v_current uuid;
  v_level int;
  v_amount numeric;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select commissions_json, price into v_commissions, v_price
      from public.packages where id = new.package_id;

    select owner_commission_percent into v_owner_percent
      from public.platform_settings where id = 1;

    select id into v_owner_id from public.profiles where role = 'owner' limit 1;

    if v_owner_id is not null then
      perform public.credit_wallet(
        v_owner_id,
        round(v_price * v_owner_percent / 100, 2),
        'owner_global', new.id,
        'Comisión global ' || v_owner_percent || '% sobre pedido'
      );
    end if;

    v_current := (select referred_by from public.profiles where id = new.user_id);
    v_level := 1;
    while v_current is not null and v_level <= 4 loop
      v_amount := (v_commissions ->> ('L' || v_level))::numeric;
      if v_amount is not null and v_amount > 0 then
        perform public.credit_wallet(
          v_current, v_amount, 'commission_l' || v_level, new.id,
          'Comisión nivel ' || v_level || ' por pedido pagado'
        );
      end if;
      v_current := (select referred_by from public.profiles where id = v_current);
      v_level := v_level + 1;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger orders_paid_commissions
  after update on public.orders
  for each row execute procedure public.handle_order_paid();

-- when a user's order becomes 'paid', unlock any previously locked balance.
create function public.handle_order_paid_unlock()
returns trigger as $$
declare
  v_locked numeric;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select balance_locked into v_locked from public.wallets where user_id = new.user_id;
    if v_locked > 0 then
      update public.wallets
        set balance_available = balance_available + v_locked,
            balance_locked = 0,
            updated_at = now()
        where user_id = new.user_id;

      insert into public.wallet_transactions (user_id, amount, type, bucket, related_order_id, description)
      values (new.user_id, v_locked, 'unlock', 'available', new.id,
              'Saldo congelado desbloqueado por activación');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger orders_paid_unlock
  after update on public.orders
  for each row execute procedure public.handle_order_paid_unlock();

-- NOTE: orders_paid_commissions and orders_paid_unlock both fire "after
-- update on orders" for the same event. Postgres runs same-event triggers
-- in alphabetical order by trigger name, so "orders_paid_commissions" runs
-- before "orders_paid_unlock" — this ordering is required: commissions for
-- upline referrers must be credited before this user's own locked balance
-- is unlocked. If either trigger is ever renamed, preserve this ordering.

-- guard against self-referral cycles in the commission chain walk
alter table public.profiles add constraint profiles_no_self_referral check (referred_by is distinct from id);
