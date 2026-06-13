# Billetera + Comisiones automáticas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the automatic commission engine and $KCA wallet — when an order is marked `paid`, commissions flow to the referral chain (L1-L4) and to the platform owner (5% global), users can see/use their balance, and the payment screen/admin panel get small reference/QR/withdrawal improvements.

**Architecture:** All business logic (commission split, locking/unlocking, balance math) lives in Postgres as `security definer` functions and triggers on `public.orders`, so it fires no matter how an order becomes `paid`. The Next.js app only reads `wallets`/`wallet_transactions` and calls two RPCs (`purchase_with_balance`, `request_withdrawal`). Admin withdrawal review reuses the existing `AdminOrderRow` pattern.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS + `security definer` SQL functions/triggers), Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-13-billetera-comisiones-design.md`

---

## Pre-requisite (handled by orchestrator, not a subagent)

Before Task 6, the file `public/payment-qr.png` must exist — it's the cropped
Bre-B QR image (no name shown) the user provided in chat. The orchestrating
session should save that image to `public/payment-qr.png` itself (subagents
have no access to chat-attached images). Task 6 assumes this file already
exists.

---

### Task 1: Database migration — tables, RLS, and `payment_reference`

**Files:**
- Create: `supabase/migrations/0003_billetera_comisiones.sql`

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Confirm the file is syntactically self-contained**

This migration only adds new tables/columns and policies that reference
functions already created in `0001_init.sql` (`is_admin_or_owner`). Re-read
the file and confirm every table referenced (`profiles`, `orders`,
`packages`) already exists in `0001_init.sql`. No automated test runs SQL in
this project (no local Postgres) — correctness is verified later when the
user runs this in the Supabase SQL Editor (Task 8).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_billetera_comisiones.sql
git commit -m "feat: add wallets, wallet_transactions, withdrawal_requests tables"
```

---

### Task 2: Database migration — commission/unlock triggers and `handle_new_user` update

**Files:**
- Modify: `supabase/migrations/0003_billetera_comisiones.sql` (append to the file created in Task 1)

- [ ] **Step 1: Append the wallet-creation update to `handle_new_user`**

The existing `handle_new_user` function (in `0001_init.sql`) inserts a row
into `profiles` on signup. Redefine it here to also create the matching
`wallets` row — `create or replace function` is safe to run again with the
same body plus one extra line:

```sql
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
```

- [ ] **Step 2: Append `is_active` (with owner override)**

```sql
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
```

- [ ] **Step 3: Append `credit_wallet` helper**

```sql
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
```

- [ ] **Step 4: Append the commission-split trigger**

```sql
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
```

- [ ] **Step 5: Append the unlock-on-activation trigger**

```sql
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
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0003_billetera_comisiones.sql
git commit -m "feat: add commission split and unlock-on-activation triggers"
```

---

### Task 3: Database migration — purchase/withdrawal RPCs

**Files:**
- Modify: `supabase/migrations/0003_billetera_comisiones.sql` (append to the file from Tasks 1-2)

- [ ] **Step 1: Append `purchase_with_balance`**

```sql
-- buy a package using the caller's available $KCA balance. Inserts the
-- order directly as 'paid', which fires the commission/unlock triggers above.
create function public.purchase_with_balance(
  p_package_code text,
  p_shipping_address jsonb,
  p_auto_renew boolean
)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_package_id uuid;
  v_price numeric;
  v_balance numeric;
  v_order_id uuid;
begin
  select id, price into v_package_id, v_price
    from public.packages where code = p_package_code;

  if v_package_id is null then
    raise exception 'Paquete no encontrado';
  end if;

  select balance_available into v_balance
    from public.wallets where user_id = v_user_id for update;

  if v_balance < v_price then
    raise exception 'Saldo insuficiente';
  end if;

  update public.wallets
    set balance_available = balance_available - v_price, updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, description)
  values (v_user_id, -v_price, 'purchase_with_balance', 'available',
          'Compra de paquete con saldo $KCA');

  insert into public.orders (user_id, package_id, shipping_address, auto_renew, status)
  values (v_user_id, v_package_id, p_shipping_address, p_auto_renew, 'paid')
  returning id into v_order_id;

  return v_order_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.purchase_with_balance(text, jsonb, boolean) to authenticated;
```

- [ ] **Step 2: Append `request_withdrawal`**

```sql
-- request a withdrawal: deducts from available balance immediately and
-- creates a pending withdrawal_requests row for admin review.
create function public.request_withdrawal(p_amount numeric, p_destination text)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Monto inválido';
  end if;

  select balance_available into v_balance
    from public.wallets where user_id = v_user_id for update;

  if v_balance < p_amount then
    raise exception 'Saldo insuficiente';
  end if;

  update public.wallets
    set balance_available = balance_available - p_amount, updated_at = now()
    where user_id = v_user_id;

  insert into public.withdrawal_requests (user_id, amount, destination)
  values (v_user_id, p_amount, p_destination)
  returning id into v_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, related_withdrawal_id, description)
  values (v_user_id, -p_amount, 'withdrawal_request', 'available', v_id, 'Solicitud de retiro');

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_withdrawal(numeric, text) to authenticated;
```

- [ ] **Step 3: Append `reject_withdrawal`**

```sql
-- admin-only: reject a pending withdrawal and refund the user's balance.
create function public.reject_withdrawal(p_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_amount numeric;
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  select user_id, amount into v_user_id, v_amount
    from public.withdrawal_requests where id = p_id and status = 'pending';

  if v_user_id is null then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  update public.withdrawal_requests
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;

  update public.wallets
    set balance_available = balance_available + v_amount, updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, related_withdrawal_id, description)
  values (v_user_id, v_amount, 'withdrawal_rejected', 'available', p_id, 'Retiro rechazado, saldo devuelto');
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.reject_withdrawal(uuid) to authenticated;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_billetera_comisiones.sql
git commit -m "feat: add purchase-with-balance and withdrawal RPCs"
```

---

### Task 4: TypeScript types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add wallet-related types and extend `Order`**

Add these new interfaces, and add `payment_reference: string | null` to the
existing `Order` interface:

```typescript
export interface Wallet {
  user_id: string
  balance_available: number
  balance_locked: number
  updated_at: string
}

export type WalletTransactionType =
  | 'commission_l1'
  | 'commission_l2'
  | 'commission_l3'
  | 'commission_l4'
  | 'owner_global'
  | 'unlock'
  | 'purchase_with_balance'
  | 'withdrawal_request'
  | 'withdrawal_rejected'

export interface WalletTransaction {
  id: string
  user_id: string
  amount: number
  type: WalletTransactionType
  bucket: 'available' | 'locked'
  related_order_id: string | null
  related_withdrawal_id: string | null
  description: string
  created_at: string
}

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected'

export interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  destination: string
  status: WithdrawalStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminWithdrawal {
  id: string
  amount: number
  destination: string
  created_at: string
  profiles: { full_name: string; phone: string } | null
}
```

Edit the existing `Order` interface to add the new field after `auto_renew`:

```typescript
export interface Order {
  id: string
  user_id: string
  package_id: string
  shipping_address: ShippingAddress
  auto_renew: boolean
  payment_reference: string | null
  status: OrderStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}
```

Also edit `AdminOrder` to include `payment_reference`:

```typescript
export interface AdminOrder {
  id: string
  created_at: string
  shipping_address: ShippingAddress
  payment_reference: string | null
  profiles: { full_name: string; phone: string } | null
  packages: { name: string; price: number } | null
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors (existing code doesn't use the new types yet, so
this should pass cleanly — if `AdminOrder`/`Order` usages elsewhere break
because they construct literals missing `payment_reference`, fix those
usages now by adding `payment_reference: null` or reading it from the query).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add wallet types and payment_reference field"
```

---

### Task 5: Wallet server actions

**Files:**
- Create: `lib/actions/wallet.ts`

- [ ] **Step 1: Write the server actions**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestWithdrawal(input: { amount: number; destination: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const destination = input.destination?.trim()
  if (!destination) {
    throw new Error('Indica a qué cuenta quieres que te transfiramos.')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Ingresa un monto válido.')
  }

  const { error } = await supabase.rpc('request_withdrawal', {
    p_amount: input.amount,
    p_destination: destination,
  })

  if (error) {
    console.error('request_withdrawal failed:', error.message)
    throw new Error(error.message.includes('Saldo insuficiente')
      ? 'No tienes suficiente saldo disponible para ese monto.'
      : 'No se pudo registrar la solicitud de retiro.')
  }

  revalidatePath('/billetera')
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/wallet.ts
git commit -m "feat: add requestWithdrawal server action"
```

---

### Task 6: `createOrder` accepts payment reference, and "pay with balance" action

**Files:**
- Modify: `lib/actions/orders.ts`

- [ ] **Step 1: Update `createOrder` to accept and store `paymentReference`**

Change the function signature and insert to include the new optional field:

```typescript
export async function createOrder(input: {
  packageCode: PackageCode
  shippingAddress: ShippingAddress
  autoRenew: boolean
  paymentReference?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const shippingAddress = validateShippingAddress(input.shippingAddress)
  const paymentReference = input.paymentReference?.trim() || null

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .select('id')
    .eq('code', input.packageCode)
    .single()

  if (pkgError || !pkg) {
    console.error('packages select failed:', pkgError?.message)
    throw new Error('El paquete seleccionado no existe.')
  }

  const { error } = await supabase.from('orders').insert({
    user_id: user.id,
    package_id: pkg.id,
    shipping_address: shippingAddress,
    auto_renew: input.autoRenew,
    payment_reference: paymentReference,
    status: 'pending_payment',
  })

  if (error) {
    console.error('orders insert failed:', error.message)
    throw new Error('No se pudo registrar el pedido.')
  }
}
```

- [ ] **Step 2: Add `purchaseWithBalance` action at the end of the same file**

```typescript
export async function purchaseWithBalance(input: {
  packageCode: PackageCode
  shippingAddress: ShippingAddress
  autoRenew: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const shippingAddress = validateShippingAddress(input.shippingAddress)

  const { error } = await supabase.rpc('purchase_with_balance', {
    p_package_code: input.packageCode,
    p_shipping_address: shippingAddress,
    p_auto_renew: input.autoRenew,
  })

  if (error) {
    console.error('purchase_with_balance failed:', error.message)
    throw new Error(error.message.includes('Saldo insuficiente')
      ? 'No tienes suficiente saldo $KCA para este paquete.'
      : 'No se pudo completar la compra con saldo.')
  }
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/orders.ts
git commit -m "feat: support payment reference and purchase-with-balance"
```

---

### Task 7: Billetera page (balance, history, withdrawal form)

**Files:**
- Modify: `app/(dashboard)/billetera/page.tsx`
- Create: `components/WithdrawalForm.tsx`

- [ ] **Step 1: Write `components/WithdrawalForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { requestWithdrawal } from '@/lib/actions/wallet'

export function WithdrawalForm({ available }: { available: number }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestWithdrawal({ amount: Number(amount), destination })
      setSuccess(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <p className="rounded-lg bg-verde-natural/10 p-3 text-sm text-verde-natural">
        Tu solicitud de retiro fue registrada. Un administrador la revisará pronto.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={available <= 0}
        className="w-full rounded-lg bg-cacao-tostado py-2 font-semibold text-blanco-cacao hover:opacity-90 disabled:opacity-50"
      >
        Solicitar retiro
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-blanco-cacao p-3">
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Monto a retirar</label>
        <input
          required
          type="number"
          min="1"
          max={available}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">
          Cuenta a la que te transferimos (Nequi, Daviplata, etc.)
        </label>
        <input
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ej: Nequi 3001234567"
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Confirmar solicitud'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-cacao-fresco/40 px-4 py-2 text-cacao-tostado"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Write `app/(dashboard)/billetera/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WithdrawalForm } from '@/components/WithdrawalForm'
import type { Wallet, WalletTransaction } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  commission_l1: 'Comisión nivel 1',
  commission_l2: 'Comisión nivel 2',
  commission_l3: 'Comisión nivel 3',
  commission_l4: 'Comisión nivel 4',
  owner_global: 'Comisión global (dueño)',
  unlock: 'Saldo desbloqueado',
  purchase_with_balance: 'Compra con saldo',
  withdrawal_request: 'Solicitud de retiro',
  withdrawal_rejected: 'Retiro rechazado (saldo devuelto)',
}

export default async function BilleteraPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (walletError) {
    console.error('wallets select failed:', walletError.message)
  }

  const { data: transactions, error: txError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (txError) {
    console.error('wallet_transactions select failed:', txError.message)
  }

  const w = wallet as Wallet | null
  const available = w?.balance_available ?? 0
  const locked = w?.balance_locked ?? 0

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-cacao-tostado">Saldo disponible</p>
        <p className="text-3xl font-bold text-verde-natural">
          ${available.toLocaleString('es-CO')} $KCA
        </p>

        {locked > 0 && (
          <p className="mt-2 rounded-lg bg-cacao-fresco/10 p-3 text-sm text-cacao-tostado">
            🔒 ${locked.toLocaleString('es-CO')} $KCA congelados — Activa tu recompra y
            disfruta de tus ganancias.
          </p>
        )}

        <div className="mt-4">
          <WithdrawalForm available={available} />
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-cacao-oscuro">Movimientos</h2>
        {!transactions?.length && (
          <p className="text-cacao-tostado">Todavía no tienes movimientos.</p>
        )}
        <div className="space-y-2">
          {(transactions as WalletTransaction[] | null)?.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between border-b border-cacao-fresco/10 pb-2 text-sm">
              <div>
                <p className="text-cacao-oscuro">{TYPE_LABELS[tx.type] ?? tx.type}</p>
                <p className="text-cacao-tostado">{new Date(tx.created_at).toLocaleDateString('es-CO')}</p>
              </div>
              <p className={tx.amount >= 0 ? 'font-semibold text-verde-natural' : 'font-semibold text-red-600'}>
                {tx.amount >= 0 ? '+' : ''}${tx.amount.toLocaleString('es-CO')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/billetera/page.tsx" components/WithdrawalForm.tsx
git commit -m "feat: build Billetera page with balance, history, and withdrawal form"
```

---

### Task 8: Purchase screen — QR, drop Nequi text, payment reference, pay with balance

**Files:**
- Modify: `components/PurchaseForm.tsx`
- Modify: `app/(dashboard)/tienda/comprar/[code]/page.tsx`

**Prerequisite:** `public/payment-qr.png` must already exist (placed by the
orchestrator, see "Pre-requisite" section at the top of this plan).

- [ ] **Step 1: Update `app/(dashboard)/tienda/comprar/[code]/page.tsx` to fetch the wallet balance**

```tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PurchaseForm } from '@/components/PurchaseForm'
import type { Package, Wallet } from '@/lib/types'

export default async function ComprarPage({ params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .select('*')
    .eq('code', params.code)
    .single()

  if (pkgError) {
    console.error('packages select failed:', pkgError.message)
  }

  if (!pkg) notFound()

  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (walletError) {
    console.error('wallets select failed:', walletError.message)
  }

  return <PurchaseForm pkg={pkg as Package} availableBalance={(wallet as Wallet | null)?.balance_available ?? 0} />
}
```

- [ ] **Step 2: Update `components/PurchaseForm.tsx`**

Replace the `PAYMENT_METHODS` constant and the payment step. The Nequi text
row is removed (the QR covers it); a Davivienda account row, the QR image,
a payment-reference field, and a "pay with balance" button are added.

Replace the top of the file (imports and constant):

```tsx
'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createOrder, purchaseWithBalance } from '@/lib/actions/orders'
import type { Package, ShippingAddress } from '@/lib/types'

const DAVIVIENDA_ACCOUNT = '4884 1069 8499'
```

Replace the component signature and add the new state/handler:

```tsx
export function PurchaseForm({ pkg, availableBalance }: { pkg: Package; availableBalance: number }) {
  const router = useRouter()
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [address, setAddress] = useState<ShippingAddress>({
    calle: '',
    ciudad: '',
    departamento: '',
    telefono: '',
  })
  const [autoRenew, setAutoRenew] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canPayWithBalance = availableBalance >= Number(pkg.price)

  function handleAddressSubmit(e: FormEvent) {
    e.preventDefault()
    if (!address.calle || !address.ciudad || !address.departamento || !address.telefono) {
      setError('Completa todos los campos de la dirección.')
      return
    }
    setError(null)
    setStep('payment')
  }

  async function handleConfirmPayment() {
    setLoading(true)
    setError(null)
    try {
      await createOrder({
        packageCode: pkg.code,
        shippingAddress: address,
        autoRenew,
        paymentReference: paymentReference || undefined,
      })
      router.push('/tienda/pedidos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pedido.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePayWithBalance() {
    setLoading(true)
    setError(null)
    try {
      await purchaseWithBalance({ packageCode: pkg.code, shippingAddress: address, autoRenew })
      router.push('/tienda/pedidos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la compra con saldo.')
    } finally {
      setLoading(false)
    }
  }
```

Replace the `if (step === 'payment')` block's JSX (the
`<div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">...</div>`)
with:

```tsx
  if (step === 'payment') {
    return (
      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-cacao-oscuro">Pagar {pkg.name}</h1>

        {canPayWithBalance && (
          <div className="rounded-lg bg-verde-natural/10 p-3">
            <p className="text-sm text-cacao-tostado">
              Tienes ${availableBalance.toLocaleString('es-CO')} $KCA disponibles.
            </p>
            <button
              onClick={handlePayWithBalance}
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-verde-natural py-2 font-semibold text-blanco-cacao hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : `Pagar con mi saldo $KCA ($${Number(pkg.price).toLocaleString('es-CO')})`}
            </button>
          </div>
        )}

        <p className="text-cacao-tostado">
          O transfiere{' '}
          <span className="font-bold text-kuma-dorado">${Number(pkg.price).toLocaleString('es-CO')}</span> a
          cualquiera de estos medios:
        </p>

        <div className="space-y-2">
          <div className="rounded-lg bg-blanco-cacao p-3 text-center">
            <p className="text-sm text-cacao-tostado">Escanea para pagar (Bre-B / Nequi / cualquier banco)</p>
            <Image src="/payment-qr.png" alt="QR de pago" width={220} height={220} className="mx-auto mt-2" />
          </div>
          <div className="rounded-lg bg-blanco-cacao p-3">
            <p className="text-sm text-cacao-tostado">Davivienda - Cuenta de ahorros</p>
            <p className="text-lg font-bold text-verde-natural">{DAVIVIENDA_ACCOUNT}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cacao-oscuro">
            Número de referencia / comprobante (opcional)
          </label>
          <input
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Ej: 123456789"
            className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
          />
        </div>

        <p className="text-sm text-cacao-tostado">
          Cuando hayas hecho la transferencia, confirma tu pedido. Un administrador verificará
          el pago.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Ya pagué'}
        </button>
      </div>
    )
  }
```

Leave the address-step JSX (the `return (<form onSubmit={handleAddressSubmit}>...)`)
unchanged.

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/PurchaseForm.tsx "app/(dashboard)/tienda/comprar/[code]/page.tsx"
git commit -m "feat: add payment QR, reference field, and pay-with-balance to purchase screen"
```

---

### Task 9: Admin panel — payment reference and withdrawal review

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `components/AdminOrderRow.tsx`
- Modify: `lib/actions/admin.ts`
- Create: `components/AdminWithdrawalRow.tsx`

- [ ] **Step 1: Show `payment_reference` in `components/AdminOrderRow.tsx`**

In the JSX, after the shipping-address `<p>` and before the buttons `<div>`,
add:

```tsx
      {order.payment_reference && (
        <p className="text-sm text-cacao-tostado">
          Referencia de pago: <span className="font-semibold text-cacao-oscuro">{order.payment_reference}</span>
        </p>
      )}
```

- [ ] **Step 2: Add `reviewWithdrawal` to `lib/actions/admin.ts`**

Append this function after `reviewOrder`:

```typescript
export async function reviewWithdrawal(id: string, status: 'paid' | 'rejected') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  if (status === 'rejected') {
    const { error } = await supabase.rpc('reject_withdrawal', { p_id: id })
    if (error) {
      console.error('reject_withdrawal failed:', error.message)
      throw new Error('No se pudo rechazar el retiro.')
    }
    return
  }

  const { data, error } = await supabase
    .from('withdrawal_requests')
    .update({ status: 'paid', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    console.error('withdrawal_requests update failed:', error.message)
    throw new Error('No se pudo actualizar el retiro.')
  }

  if (!data?.length) {
    throw new Error('Este retiro ya fue revisado o no existe.')
  }
}
```

- [ ] **Step 3: Write `components/AdminWithdrawalRow.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { reviewWithdrawal } from '@/lib/actions/admin'
import type { AdminWithdrawal } from '@/lib/types'

export function AdminWithdrawalRow({ withdrawal }: { withdrawal: AdminWithdrawal }) {
  const [loading, setLoading] = useState<'paid' | 'rejected' | null>(null)
  const [done, setDone] = useState(false)

  async function handleReview(status: 'paid' | 'rejected') {
    setLoading(status)
    try {
      await reviewWithdrawal(withdrawal.id, status)
      setDone(true)
    } catch (err) {
      console.error('reviewWithdrawal failed:', err instanceof Error ? err.message : err)
    } finally {
      setLoading(null)
    }
  }

  if (done) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-cacao-oscuro">
        {withdrawal.profiles?.full_name} · {withdrawal.profiles?.phone}
      </p>
      <p className="text-sm text-cacao-tostado">
        Monto: <span className="font-bold text-kuma-dorado">${Number(withdrawal.amount).toLocaleString('es-CO')}</span>
      </p>
      <p className="text-sm text-cacao-tostado">Destino: {withdrawal.destination}</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => handleReview('paid')}
          disabled={loading !== null}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading === 'paid' ? 'Guardando...' : 'Marcar pagado'}
        </button>
        <button
          onClick={() => handleReview('rejected')}
          disabled={loading !== null}
          className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading === 'rejected' ? 'Guardando...' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `app/admin/page.tsx`**

Add `payment_reference` to the orders select, fetch withdrawal requests, and
render the new section. The full updated file:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminOrderRow } from '@/components/AdminOrderRow'
import { AdminWithdrawalRow } from '@/components/AdminWithdrawalRow'
import type { AdminOrder, AdminWithdrawal } from '@/lib/types'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles role lookup failed:', profileError.message)
  }

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    redirect('/inicio')
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, created_at, shipping_address, payment_reference, profiles!orders_user_id_fkey(full_name, phone), packages(name, price)')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true })

  if (ordersError) {
    console.error('orders select failed:', ordersError.message)
  }

  const { data: withdrawals, error: withdrawalsError } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, destination, created_at, profiles(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (withdrawalsError) {
    console.error('withdrawal_requests select failed:', withdrawalsError.message)
  }

  return (
    <div className="min-h-screen bg-blanco-cacao p-4">
      <h1 className="mb-4 text-xl font-bold text-cacao-oscuro">Pedidos pendientes</h1>
      <div className="space-y-3">
        {!orders?.length && <p className="text-cacao-tostado">No hay pedidos pendientes.</p>}
        {(orders as unknown as AdminOrder[] | null)?.map((order) => (
          <AdminOrderRow key={order.id} order={order} />
        ))}
      </div>

      <h1 className="mb-4 mt-6 text-xl font-bold text-cacao-oscuro">Retiros pendientes</h1>
      <div className="space-y-3">
        {!withdrawals?.length && <p className="text-cacao-tostado">No hay retiros pendientes.</p>}
        {(withdrawals as unknown as AdminWithdrawal[] | null)?.map((w) => (
          <AdminWithdrawalRow key={w.id} withdrawal={w} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx components/AdminOrderRow.tsx components/AdminWithdrawalRow.tsx lib/actions/admin.ts
git commit -m "feat: show payment references and review withdrawals in admin panel"
```

---

### Task 10: Run the migration and verify end-to-end

This task is **not code** — it's the guided, copy-paste steps for Pedro to
run in Supabase, plus an E2E checklist. Write this up as the final message
to the user (or as a short doc) once Tasks 1-9 are committed:

- [ ] **Step 1: Provide copy-paste SQL**

Give the user the full contents of `supabase/migrations/0003_billetera_comisiones.sql`
to paste into Supabase SQL Editor → New query → Run, with the exact
navigation steps (matching the style used for `0002_fix_profiles_rls_recursion.sql`).

- [ ] **Step 2: E2E verification checklist (Playwright against the live app)**

1. Log in as the test account (phone `3219876543`, already has one `paid`
   KUMA 1 order). Visit `/billetera` — confirm it shows a balance (the
   commission from its own referral chain, if any) instead of "Próximamente".
2. Log in as the owner account (phone `3213586024`). Visit `/billetera` —
   confirm it shows the 5% owner commission from the test account's existing
   paid order (`$75.000 * 5% = $3.750`).
3. As the test account, go to `/tienda/comprar/kuma1`, fill the address,
   confirm the payment screen shows: the QR image, the Davivienda account
   number, the "Número de referencia" field, and NO Nequi text row.
4. Enter a payment reference, submit "Ya pagué". As admin, open `/admin` and
   confirm the new pending order shows "Referencia de pago: ...".
5. Approve that order. Revisit `/billetera` for the referrer accounts in the
   chain and confirm balances increased per the commission table in the
   spec (locked vs. available depending on `is_active`).
6. From `/billetera`, click "Solicitar retiro", submit an amount ≤ available
   balance. Confirm the available balance decreases immediately.
7. As admin, open `/admin`, confirm the withdrawal appears under "Retiros
   pendientes" with the right amount/destination. Click "Marcar pagado" —
   row disappears.
8. Repeat a withdrawal request, this time click "Rechazar" — confirm the
   user's available balance is refunded by that amount.
9. If the test account has enough available balance to cover a KUMA1
   ($75.000), go to `/tienda/comprar/kuma1` and confirm the "Pagar con mi
   saldo $KCA" button appears; click it and confirm it redirects straight to
   `/tienda/pedidos` with status `paid` (no admin approval needed), and that
   the balance decreased by the package price.

- [ ] **Step 3: No commit** — this task only verifies the work done in Tasks 1-9.

---

## Self-Review Notes

- **Spec coverage:** §3.1-3.4 (tables/columns) → Task 1. §3.5-3.9 (triggers,
  `is_active`, `credit_wallet`, unlock) → Task 2. §3.10-3.12 (RPCs) → Task 3.
  §4 (owner exceptions) → `is_active` owner override in Task 2 and
  `owner_global` commission in Task 2 step 4; the `activation_requirement`
  (min_direct_referrals) gate described in spec §4 has **no existing
  enforcement anywhere in the Fase 1 codebase** (verified: it's only
  displayed as informational text on `PackageCard`), so there is nothing to
  except — no task adds new gating logic, consistent with YAGNI. §5.1
  (Billetera UI) → Task 7. §5.2 (payment screen) → Task 8. §5.3 (admin) →
  Task 9. §6 (example) → covered by Task 10 E2E checklist. §7 (edge cases)
  → handled by the `old.status <> 'paid'` guards (Task 2) and RPC exception
  messages (Task 3).
- **Placeholder scan:** none found — every step has full code.
- **Type consistency:** `Wallet`, `WalletTransaction`, `WithdrawalRequest`,
  `AdminWithdrawal` (Task 4) are used as-is in Tasks 5-9 without renaming.
  `purchaseWithBalance`/`requestWithdrawal`/`reviewWithdrawal` names match
  between action files and component imports.
