# Separación de Saldos + Catálogo de Canje — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar la billetera del usuario en dos saldos independientes —
"Comisiones por venta" (dinero, sin cambios) y "Puntos de fidelización"
(nuevo, ganado solo con la ruleta) — y construir un catálogo de canje de
puntos por premios (giro extra, cupones de descuento, bolsa gratis).

**Architecture:** Tres migraciones SQL (nueva columna + tablas, cambio en
`spin_roulette()` + nueva función `redeem_loyalty_reward()`, y soporte de
cupones en `purchase_with_balance()` / nueva función
`apply_voucher_to_order()`). En el frontend: una constante `REWARD_CATALOG`
en `lib/constants.ts`, una pantalla nueva `/billetera/canjear`, una tarjeta
nueva en la Billetera, y soporte de cupones en `PurchaseForm`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres +
RPC vía `supabase.rpc`), Tailwind, Vitest.

---

## Contexto para quien ejecute este plan

- El proyecto vive en `C:\Users\Estudiante\Documents\kuma-axis`.
- Las migraciones SQL se numeran secuencialmente en `supabase/migrations/`.
  La última existente es `0010_premios_grandes.sql`. Las nuevas son
  `0011`, `0012`, `0013`.
- Las migraciones **no se ejecutan automáticamente** — al final del plan
  hay instrucciones para que el usuario las pegue en el SQL Editor de
  Supabase y confirme con una captura de pantalla, igual que en
  migraciones anteriores.
- Patrón de funciones `security definer`: usan `auth.uid()` internamente
  (nunca reciben el user id como parámetro), `set search_path = public`, y
  terminan con `grant execute on function ... to authenticated;`.
- Tests con `npm test` (= `vitest run`). Build con `npm run build`.

---

### Task 1: Migración — columna `loyalty_points_balance` y tablas de recompensas

**Files:**
- Create: `supabase/migrations/0011_loyalty_points.sql`

- [ ] **Step 1: Escribir la migración**

```sql
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
```

- [ ] **Step 2: Verificar que el archivo está bien formado**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && Get-Content supabase/migrations/0011_loyalty_points.sql | Select-Object -Last 5`
(o en bash: `tail -5 supabase/migrations/0011_loyalty_points.sql`)

Expected: las últimas líneas muestran el bloque de la policy
`reward_vouchers_select_own_or_admin` completo, sin errores de sintaxis
visibles (paréntesis balanceados).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0011_loyalty_points.sql
git commit -m "feat: add loyalty_points_balance column and reward tables"
```

---

### Task 2: Migración — la ruleta paga puntos + función de canje

**Files:**
- Create: `supabase/migrations/0012_redeem_rewards.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- 0012_redeem_rewards.sql --------------------------------------------------
-- La ruleta deja de pagar dinero (credit_wallet) y empieza a pagar puntos
-- de fidelización. Se agrega la función para canjear esos puntos por
-- premios del catálogo.

create or replace function public.spin_roulette()
returns table (prize_label text, prize_amount numeric) as $$
declare
  v_user_id uuid := auth.uid();
  v_daily int;
  v_referral int;
  v_roll numeric := random() * 100;
  v_label text;
  v_amount numeric;
begin
  select daily_spins_remaining, referral_spins_balance
    into v_daily, v_referral
    from public.spin_credits where user_id = v_user_id for update;

  if v_daily is null or (v_daily + v_referral) <= 0 then
    raise exception 'No tienes giros disponibles';
  end if;

  if v_daily > 0 then
    update public.spin_credits set daily_spins_remaining = daily_spins_remaining - 1,
      updated_at = now() where user_id = v_user_id;
  else
    update public.spin_credits set referral_spins_balance = referral_spins_balance - 1,
      updated_at = now() where user_id = v_user_id;
  end if;

  v_label := case
    when v_roll < 25    then 'Vuelve y juega'
    when v_roll < 40    then '$50'
    when v_roll < 52    then '$100'
    when v_roll < 62    then '$150'
    when v_roll < 70    then '$200'
    when v_roll < 77    then '$250'
    when v_roll < 83    then '$300'
    when v_roll < 88    then '$350'
    when v_roll < 92    then '$400'
    when v_roll < 95    then '$450'
    when v_roll < 97.5  then '$500'
    when v_roll < 98.7  then '$1.000'
    when v_roll < 99.4  then '$2.000'
    when v_roll < 99.8  then '$3.000'
    when v_roll < 99.98 then '$5.000'
    else                     '$10.000'
  end;

  v_amount := case
    when v_roll < 25    then 0
    when v_roll < 40    then 50
    when v_roll < 52    then 100
    when v_roll < 62    then 150
    when v_roll < 70    then 200
    when v_roll < 77    then 250
    when v_roll < 83    then 300
    when v_roll < 88    then 350
    when v_roll < 92    then 400
    when v_roll < 95    then 450
    when v_roll < 97.5  then 500
    when v_roll < 98.7  then 1000
    when v_roll < 99.4  then 2000
    when v_roll < 99.8  then 3000
    when v_roll < 99.98 then 5000
    else                     10000
  end;

  if v_amount > 0 then
    update public.wallets
      set loyalty_points_balance = loyalty_points_balance + v_amount,
          updated_at = now()
      where user_id = v_user_id;
  else
    update public.spin_credits set referral_spins_balance = referral_spins_balance + 1,
      updated_at = now() where user_id = v_user_id;
  end if;

  insert into public.spin_history (user_id, prize_label, prize_amount)
  values (v_user_id, v_label, v_amount);

  return query select v_label, v_amount;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.spin_roulette() to authenticated;

-- redeem_loyalty_reward: canjea puntos de fidelización por un premio del
-- catálogo. Los costos en puntos deben coincidir con REWARD_CATALOG en
-- lib/constants.ts.
create function public.redeem_loyalty_reward(p_reward_code text)
returns void as $$
declare
  v_user_id uuid := auth.uid();
  v_points_cost int;
  v_discount numeric;
  v_updated int;
begin
  case p_reward_code
    when 'extra_spin' then v_points_cost := 50;
    when 'discount_5000' then v_points_cost := 500;
    when 'discount_10000' then v_points_cost := 1000;
    when 'free_bag' then v_points_cost := 1800;
    else raise exception 'Premio no válido';
  end case;

  update public.wallets
    set loyalty_points_balance = loyalty_points_balance - v_points_cost,
        updated_at = now()
    where user_id = v_user_id
      and loyalty_points_balance >= v_points_cost;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'No tienes suficientes puntos de fidelización';
  end if;

  if p_reward_code = 'extra_spin' then
    update public.spin_credits
      set referral_spins_balance = referral_spins_balance + 1,
          updated_at = now()
      where user_id = v_user_id;
  else
    v_discount := case p_reward_code
      when 'discount_5000' then 5000
      when 'discount_10000' then 10000
      when 'free_bag' then 15000
    end;

    insert into public.reward_vouchers (user_id, discount_amount, source_reward_code)
    values (v_user_id, v_discount, p_reward_code);
  end if;

  insert into public.reward_redemptions (user_id, reward_code, points_spent)
  values (v_user_id, p_reward_code, v_points_cost);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.redeem_loyalty_reward(text) to authenticated;
```

- [ ] **Step 2: Verificar sintaxis del archivo**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && Get-Content supabase/migrations/0012_redeem_rewards.sql | Select-String "language plpgsql"`

Expected: dos coincidencias (`spin_roulette` y `redeem_loyalty_reward`),
ambas terminando en `security definer set search_path = public;`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0012_redeem_rewards.sql
git commit -m "feat: roulette pays loyalty points and add redeem_loyalty_reward RPC"
```

---

### Task 3: Migración — aplicar cupones a una compra

**Files:**
- Create: `supabase/migrations/0013_apply_vouchers.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- 0013_apply_vouchers.sql --------------------------------------------------
-- Permite marcar un cupón (reward_vouchers) como usado al confirmar una
-- compra, y agrega soporte de cupones a purchase_with_balance.

-- apply_voucher_to_order: usado por el flujo de "transferencia" (createOrder).
-- Marca el cupón como usado y lo asocia al pedido. Devuelve el descuento
-- (solo informativo: en el flujo de transferencia el pago lo verifica un
-- administrador manualmente).
create function public.apply_voucher_to_order(p_voucher_id uuid, p_order_id uuid)
returns numeric as $$
declare
  v_user_id uuid := auth.uid();
  v_discount numeric;
begin
  update public.reward_vouchers
    set status = 'used', used_order_id = p_order_id, used_at = now()
    where id = p_voucher_id and user_id = v_user_id and status = 'available'
  returning discount_amount into v_discount;

  if v_discount is null then
    raise exception 'Cupón no disponible';
  end if;

  return v_discount;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.apply_voucher_to_order(uuid, uuid) to authenticated;

-- purchase_with_balance: agrega un 4to parámetro opcional p_voucher_id.
-- Se elimina la versión anterior (3 parámetros) para evitar ambigüedad de
-- sobrecarga entre funciones con el mismo nombre.
drop function if exists public.purchase_with_balance(text, jsonb, boolean);

create function public.purchase_with_balance(
  p_package_code text,
  p_shipping_address jsonb,
  p_auto_renew boolean,
  p_voucher_id uuid default null
)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_package_id uuid;
  v_price numeric;
  v_balance numeric;
  v_order_id uuid;
  v_discount numeric := 0;
begin
  select id, price into v_package_id, v_price
    from public.packages where code = p_package_code;

  if v_package_id is null then
    raise exception 'Paquete no encontrado';
  end if;

  if p_voucher_id is not null then
    update public.reward_vouchers
      set status = 'used', used_at = now()
      where id = p_voucher_id and user_id = v_user_id and status = 'available'
    returning discount_amount into v_discount;

    if v_discount is null then
      raise exception 'Cupón no disponible';
    end if;

    v_price := greatest(v_price - v_discount, 0);
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
  values (v_user_id, v_package_id, p_shipping_address, p_auto_renew, 'pending_payment')
  returning id into v_order_id;

  update public.orders set status = 'paid' where id = v_order_id;

  if p_voucher_id is not null then
    update public.reward_vouchers set used_order_id = v_order_id where id = p_voucher_id;
  end if;

  return v_order_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.purchase_with_balance(text, jsonb, boolean, uuid) to authenticated;
```

- [ ] **Step 2: Verificar que no quedan referencias a la firma vieja**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && Get-Content supabase/migrations/0013_apply_vouchers.sql | Select-String "purchase_with_balance"`

Expected: aparece `drop function if exists public.purchase_with_balance(text, jsonb, boolean);`,
la definición `create function public.purchase_with_balance(` con 4
parámetros, y el `grant execute on function public.purchase_with_balance(text, jsonb, boolean, uuid)`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_apply_vouchers.sql
git commit -m "feat: support applying reward vouchers to orders"
```

---

### Task 4: Catálogo de premios en `lib/constants.ts`

**Files:**
- Modify: `lib/constants.ts`
- Modify: `lib/constants.test.ts`

- [ ] **Step 1: Escribir los tests del catálogo**

Agrega al final de `lib/constants.test.ts`:

```ts
import { REWARD_CATALOG, REWARD_CATALOG_BY_CODE } from './constants'

describe('REWARD_CATALOG', () => {
  it('has 4 rewards', () => {
    expect(REWARD_CATALOG).toHaveLength(4)
  })

  it('starts with the cheapest reward (extra spin)', () => {
    expect(REWARD_CATALOG[0]).toEqual({
      code: 'extra_spin',
      label: '🎰 1 giro extra de ruleta',
      description: 'Suma un giro adicional a tu ruleta de fidelización.',
      pointsCost: 50,
      kind: 'extra_spin',
    })
  })

  it('includes voucher rewards with a discount amount', () => {
    expect(REWARD_CATALOG_BY_CODE.discount_5000).toEqual({
      code: 'discount_5000',
      label: '🎟️ $5.000 de descuento',
      description: 'Cupón de $5.000 de descuento en tu próxima compra.',
      pointsCost: 500,
      kind: 'voucher',
      voucherDiscount: 5000,
    })
  })

  it('ends with the free bag reward', () => {
    expect(REWARD_CATALOG[3]).toEqual({
      code: 'free_bag',
      label: '🍫 1 bolsa de chocolate gratis (250g)',
      description: 'Cupón equivalente al valor de una bolsa, aplicado como descuento en tu próxima compra.',
      pointsCost: 1800,
      kind: 'voucher',
      voucherDiscount: 15000,
    })
  })
})
```

The new `import` line goes alongside the existing
`import { describe, it, expect } from 'vitest'` import at the top — add it
as a second import statement, don't replace the first one.

- [ ] **Step 2: Ejecutar los tests y verificar que fallan**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm test`

Expected: FAIL — `REWARD_CATALOG` is not exported from `./constants`.

- [ ] **Step 3: Implementar el catálogo**

Agrega al final de `lib/constants.ts`:

```ts
export type RewardCode = 'extra_spin' | 'discount_5000' | 'discount_10000' | 'free_bag'

export interface RewardCatalogItem {
  code: RewardCode
  label: string
  description: string
  pointsCost: number
  kind: 'extra_spin' | 'voucher'
  voucherDiscount?: number
}

export const REWARD_CATALOG: RewardCatalogItem[] = [
  {
    code: 'extra_spin',
    label: '🎰 1 giro extra de ruleta',
    description: 'Suma un giro adicional a tu ruleta de fidelización.',
    pointsCost: 50,
    kind: 'extra_spin',
  },
  {
    code: 'discount_5000',
    label: '🎟️ $5.000 de descuento',
    description: 'Cupón de $5.000 de descuento en tu próxima compra.',
    pointsCost: 500,
    kind: 'voucher',
    voucherDiscount: 5000,
  },
  {
    code: 'discount_10000',
    label: '🎟️ $10.000 de descuento',
    description: 'Cupón de $10.000 de descuento en tu próxima compra.',
    pointsCost: 1000,
    kind: 'voucher',
    voucherDiscount: 10000,
  },
  {
    code: 'free_bag',
    label: '🍫 1 bolsa de chocolate gratis (250g)',
    description: 'Cupón equivalente al valor de una bolsa, aplicado como descuento en tu próxima compra.',
    pointsCost: 1800,
    kind: 'voucher',
    voucherDiscount: 15000,
  },
]

export const REWARD_CATALOG_BY_CODE: Record<RewardCode, RewardCatalogItem> = Object.fromEntries(
  REWARD_CATALOG.map((item) => [item.code, item])
) as Record<RewardCode, RewardCatalogItem>
```

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm test`

Expected: PASS — todos los tests, incluyendo los 4 nuevos de
`REWARD_CATALOG`.

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts lib/constants.test.ts
git commit -m "feat: add REWARD_CATALOG for loyalty points redemption"
```

---

### Task 5: Tipos TypeScript — `Wallet`, `RewardVoucher`, `RewardRedemption`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Agregar `loyalty_points_balance` a `Wallet` y los nuevos tipos**

En `lib/types.ts`, reemplaza la interfaz `Wallet` existente:

```ts
export interface Wallet {
  user_id: string
  balance_available: number
  balance_locked: number
  loyalty_points_balance: number
  updated_at: string
}
```

Y agrega al final del archivo (después de `SpinHistoryEntry`):

```ts
export type RewardVoucherStatus = 'available' | 'used'

export interface RewardVoucher {
  id: string
  user_id: string
  discount_amount: number
  status: RewardVoucherStatus
  source_reward_code: string
  used_order_id: string | null
  created_at: string
  used_at: string | null
}

export interface RewardRedemption {
  id: string
  user_id: string
  reward_code: string
  points_spent: number
  created_at: string
}
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm run build`

Expected: el build puede fallar más adelante por otras tareas pendientes
(componentes que aún no usan los nuevos tipos no causan error — los tipos
nuevos son aditivos). Si falla por algo relacionado a `Wallet` o
`loyalty_points_balance`, revisa que no haya quedado una coma o llave mal
cerrada en `lib/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add loyalty points and reward voucher types"
```

---

### Task 6: Server action `redeemReward`

**Files:**
- Create: `lib/actions/rewards.ts`

- [ ] **Step 1: Implementar la acción**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { RewardCode } from '@/lib/constants'

export async function redeemReward(code: RewardCode) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.rpc('redeem_loyalty_reward', { p_reward_code: code })

  if (error) {
    console.error('redeem_loyalty_reward failed:', error.message)
    throw new Error(
      error.message.includes('No tienes suficientes puntos')
        ? 'No tienes suficientes puntos de fidelización para este premio.'
        : 'No se pudo canjear el premio.'
    )
  }

  revalidatePath('/billetera')
  revalidatePath('/billetera/canjear')
}
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm run build`

Expected: sin nuevos errores relacionados con `lib/actions/rewards.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/rewards.ts
git commit -m "feat: add redeemReward server action"
```

---

### Task 7: Pantalla de catálogo `/billetera/canjear`

**Files:**
- Create: `components/RewardCatalog.tsx`
- Create: `app/(dashboard)/billetera/canjear/page.tsx`

- [ ] **Step 1: Crear el componente `RewardCatalog`**

```tsx
'use client'

import { useState } from 'react'
import { redeemReward } from '@/lib/actions/rewards'
import { REWARD_CATALOG, type RewardCode } from '@/lib/constants'

export function RewardCatalog({ points }: { points: number }) {
  const [loadingCode, setLoadingCode] = useState<RewardCode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleRedeem(code: RewardCode) {
    setLoadingCode(code)
    setError(null)
    setMessage(null)
    try {
      await redeemReward(code)
      setMessage('¡Premio canjeado! Revisa tu billetera.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo canjear el premio.')
    } finally {
      setLoadingCode(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-white p-4 text-cacao-tostado shadow-sm">
        Tienes <span className="font-bold text-verde-natural">{points.toLocaleString('es-CO')} puntos</span> de
        fidelización.
      </p>

      {message && (
        <p className="rounded-lg bg-verde-natural/10 p-3 text-sm text-verde-natural">{message}</p>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {REWARD_CATALOG.map((item) => {
          const canRedeem = points >= item.pointsCost
          return (
            <div key={item.code} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-semibold text-cacao-oscuro">{item.label}</p>
                <p className="text-sm text-cacao-tostado">{item.description}</p>
                <p className="text-sm text-cacao-tostado">{item.pointsCost.toLocaleString('es-CO')} puntos</p>
              </div>
              <button
                onClick={() => handleRedeem(item.code)}
                disabled={!canRedeem || loadingCode !== null}
                className="shrink-0 rounded-lg bg-verde-natural px-3 py-2 text-sm font-semibold text-blanco-cacao hover:opacity-90 disabled:opacity-40"
              >
                {loadingCode === item.code
                  ? 'Canjeando...'
                  : canRedeem
                    ? 'Canjear'
                    : `Te faltan ${(item.pointsCost - points).toLocaleString('es-CO')} pts`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear la página `/billetera/canjear`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RewardCatalog } from '@/components/RewardCatalog'
import type { Wallet } from '@/lib/types'

export default async function CanjearPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('wallets select failed:', error.message)
  }

  const points = (wallet as Wallet | null)?.loyalty_points_balance ?? 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Catálogo de premios 🎁</h1>
      <RewardCatalog points={points} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm run build`

Expected: build exitoso, sin errores en `RewardCatalog.tsx` ni en
`app/(dashboard)/billetera/canjear/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/RewardCatalog.tsx "app/(dashboard)/billetera/canjear/page.tsx"
git commit -m "feat: add loyalty rewards catalog screen"
```

---

### Task 8: Tarjeta "Puntos de fidelización" en Billetera

**Files:**
- Create: `components/LoyaltyPointsCard.tsx`
- Modify: `app/(dashboard)/billetera/page.tsx`

- [ ] **Step 1: Crear `LoyaltyPointsCard`**

```tsx
import Link from 'next/link'
import { REWARD_CATALOG_BY_CODE } from '@/lib/constants'
import type { RewardVoucher } from '@/lib/types'

export function LoyaltyPointsCard({ points, vouchers }: { points: number; vouchers: RewardVoucher[] }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-cacao-tostado">Puntos de fidelización</p>
      <p className="text-3xl font-bold text-verde-natural">{points.toLocaleString('es-CO')} pts</p>

      <Link
        href="/billetera/canjear"
        className="mt-3 block w-full rounded-lg bg-verde-natural py-2 text-center font-semibold text-blanco-cacao hover:opacity-90"
      >
        Ver catálogo de premios
      </Link>

      {vouchers.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-cacao-oscuro">Tus cupones disponibles:</p>
          <ul className="mt-1 space-y-1 text-sm text-cacao-tostado">
            {vouchers.map((voucher) => (
              <li key={voucher.id}>
                •{' '}
                {REWARD_CATALOG_BY_CODE[voucher.source_reward_code as keyof typeof REWARD_CATALOG_BY_CODE]?.label
                  ?? `🎟️ $${voucher.discount_amount.toLocaleString('es-CO')} de descuento`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Actualizar la página de Billetera**

Reemplaza el contenido de `app/(dashboard)/billetera/page.tsx` por:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WithdrawalForm } from '@/components/WithdrawalForm'
import { LoyaltyPointsCard } from '@/components/LoyaltyPointsCard'
import type { RewardVoucher, Wallet, WalletTransaction } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  commission_l1: 'Recompensa de fidelización nivel 1',
  commission_l2: 'Recompensa de fidelización nivel 2',
  commission_l3: 'Recompensa de fidelización nivel 3',
  commission_l4: 'Recompensa de fidelización nivel 4',
  owner_global: 'Bono de fundador',
  unlock: 'Puntos liberados',
  purchase_with_balance: 'Compra con puntos',
  withdrawal_request: 'Solicitud de redención',
  withdrawal_rejected: 'Redención rechazada (puntos devueltos)',
  roulette_prize: 'Premio de fidelización (ruleta) — histórico',
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

  const { data: vouchers, error: voucherError } = await supabase
    .from('reward_vouchers')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'available')

  if (voucherError) {
    console.error('reward_vouchers select failed:', voucherError.message)
  }

  const w = wallet as Wallet | null
  const available = w?.balance_available ?? 0
  const locked = w?.balance_locked ?? 0
  const points = w?.loyalty_points_balance ?? 0

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-cacao-tostado">Comisiones por venta disponibles</p>
        <p className="text-3xl font-bold text-kuma-dorado">${available.toLocaleString('es-CO')}</p>

        {locked > 0 && (
          <p className="mt-2 rounded-lg bg-cacao-fresco/10 p-3 text-sm text-cacao-tostado">
            🔒 ${locked.toLocaleString('es-CO')} bloqueados — Activa tu recompra y disfruta de tus
            recompensas.
          </p>
        )}

        <div className="mt-4">
          <WithdrawalForm available={available} />
        </div>
      </div>

      <LoyaltyPointsCard points={points} vouchers={(vouchers as RewardVoucher[] | null) ?? []} />

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

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm run build`

Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add components/LoyaltyPointsCard.tsx "app/(dashboard)/billetera/page.tsx"
git commit -m "feat: split billetera into commissions and loyalty points cards"
```

---

### Task 9: Cupones en `PurchaseForm`

**Files:**
- Modify: `lib/actions/orders.ts`
- Modify: `components/PurchaseForm.tsx`
- Modify: `app/(dashboard)/tienda/comprar/[code]/page.tsx`

- [ ] **Step 1: Actualizar `createOrder` y `purchaseWithBalance` en `lib/actions/orders.ts`**

Reemplaza la función `createOrder` completa por:

```ts
export async function createOrder(input: {
  packageCode: PackageCode
  shippingAddress: ShippingAddress
  autoRenew: boolean
  paymentReference?: string
  voucherId?: string
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

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      shipping_address: shippingAddress,
      auto_renew: input.autoRenew,
      payment_reference: paymentReference,
      status: 'pending_payment',
    })
    .select('id')
    .single()

  if (error || !order) {
    console.error('orders insert failed:', error?.message)
    throw new Error('No se pudo registrar el pedido.')
  }

  if (input.voucherId) {
    const { error: voucherError } = await supabase.rpc('apply_voucher_to_order', {
      p_voucher_id: input.voucherId,
      p_order_id: order.id,
    })

    if (voucherError) {
      console.error('apply_voucher_to_order failed:', voucherError.message)
    }
  }
}
```

Reemplaza la función `purchaseWithBalance` completa por:

```ts
export async function purchaseWithBalance(input: {
  packageCode: PackageCode
  shippingAddress: ShippingAddress
  autoRenew: boolean
  voucherId?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const shippingAddress = validateShippingAddress(input.shippingAddress)

  const { error } = await supabase.rpc('purchase_with_balance', {
    p_package_code: input.packageCode,
    p_shipping_address: shippingAddress,
    p_auto_renew: input.autoRenew,
    p_voucher_id: input.voucherId ?? null,
  })

  if (error) {
    console.error('purchase_with_balance failed:', error.message)
    throw new Error(error.message.includes('Saldo insuficiente')
      ? 'No tienes suficiente saldo $KCA para este paquete.'
      : 'No se pudo completar la compra con saldo.')
  }
}
```

- [ ] **Step 2: Pasar el cupón disponible desde la página de compra**

En `app/(dashboard)/tienda/comprar/[code]/page.tsx`, agrega la consulta del
cupón y pásalo a `PurchaseForm`. El archivo completo queda así:

```tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PurchaseForm } from '@/components/PurchaseForm'
import type { Package, RewardVoucher, Wallet } from '@/lib/types'

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

  const { data: voucher, error: voucherError } = await supabase
    .from('reward_vouchers')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'available')
    .order('discount_amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (voucherError) {
    console.error('reward_vouchers select failed:', voucherError.message)
  }

  return (
    <PurchaseForm
      pkg={pkg as Package}
      availableBalance={(wallet as Wallet | null)?.balance_available ?? 0}
      voucher={(voucher as RewardVoucher | null) ?? null}
    />
  )
}
```

- [ ] **Step 3: Actualizar `PurchaseForm` para mostrar y aplicar el cupón**

En `components/PurchaseForm.tsx`:

1. Importa el tipo `RewardVoucher` y agrega la prop `voucher`:

```tsx
import type { Package, RewardVoucher, ShippingAddress } from '@/lib/types'
```

```tsx
export function PurchaseForm({
  pkg,
  availableBalance,
  voucher,
}: {
  pkg: Package
  availableBalance: number
  voucher: RewardVoucher | null
}) {
```

2. Agrega el estado `applyVoucher` (justo después de `autoRenew`):

```tsx
  const [applyVoucher, setApplyVoucher] = useState(Boolean(voucher))
```

3. Justo antes de `const canPayWithBalance = ...`, calcula el precio con
   descuento y reemplaza la línea de `canPayWithBalance`:

```tsx
  const discount = voucher && applyVoucher ? voucher.discount_amount : 0
  const finalPrice = Math.max(Number(pkg.price) - discount, 0)
  const canPayWithBalance = availableBalance >= finalPrice
```

4. En `handleConfirmPayment`, agrega `voucherId` al llamado de `createOrder`:

```tsx
      await createOrder({
        packageCode: pkg.code,
        shippingAddress: address,
        autoRenew,
        paymentReference: paymentReference || undefined,
        voucherId: voucher && applyVoucher ? voucher.id : undefined,
      })
```

5. En `handlePayWithBalance`, agrega `voucherId` al llamado de `purchaseWithBalance`:

```tsx
      await purchaseWithBalance({
        packageCode: pkg.code,
        shippingAddress: address,
        autoRenew,
        voucherId: voucher && applyVoucher ? voucher.id : undefined,
      })
```

6. En la vista de `step === 'payment'`, justo después de
   `<h1 className="text-xl font-bold text-cacao-oscuro">Pagar {pkg.name}</h1>`,
   agrega el bloque del cupón:

```tsx
        {voucher && (
          <label className="flex items-start gap-2 rounded-lg bg-verde-natural/10 p-3 text-sm text-cacao-oscuro">
            <input
              type="checkbox"
              checked={applyVoucher}
              onChange={(e) => setApplyVoucher(e.target.checked)}
              className="mt-1"
            />
            <span>
              Tienes un cupón de <strong>${voucher.discount_amount.toLocaleString('es-CO')}</strong> de
              descuento disponible. Se aplicará a esta compra.
            </span>
          </label>
        )}
```

7. Reemplaza las referencias a `Number(pkg.price)` en la vista de pago
   (botón de pagar con puntos y el monto a transferir) por `finalPrice`:

```tsx
              {loading ? 'Procesando...' : `Pagar con mis puntos KCA ($${finalPrice.toLocaleString('es-CO')})`}
```

```tsx
          <span className="font-bold text-kuma-dorado">${finalPrice.toLocaleString('es-CO')}</span> a
```

- [ ] **Step 4: Verificar que el proyecto compila**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm run build`

Expected: build exitoso, sin errores de tipos en `PurchaseForm.tsx`,
`orders.ts` ni la página de compra.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/orders.ts components/PurchaseForm.tsx "app/(dashboard)/tienda/comprar/[code]/page.tsx"
git commit -m "feat: apply reward vouchers as discounts when purchasing a package"
```

---

### Task 10: Mensajes de la Ruleta — "puntos de fidelización"

**Files:**
- Modify: `components/RouletteClient.tsx`

- [ ] **Step 1: Actualizar el mensaje de resultado**

En `components/RouletteClient.tsx`, dentro de `handleSpin`, donde dice:

```tsx
      setResultMessage(
        `¡Ganaste un premio de fidelización! +${result.prize_amount.toLocaleString('es-CO')} puntos KCA 🍫🎉`
      )
```

cámbialo por:

```tsx
      setResultMessage(
        `¡Ganaste un premio de fidelización! +${result.prize_amount.toLocaleString('es-CO')} puntos de fidelización 🍫🎉`
      )
```

- [ ] **Step 2: Actualizar el historial de premios**

Donde dice:

```tsx
              <p className="text-cacao-oscuro">
                {h.prize_amount > 0 ? `🍫 $${h.prize_amount.toLocaleString('es-CO')}` : '🍫 Otra vez'}
              </p>
```

cámbialo por:

```tsx
              <p className="text-cacao-oscuro">
                {h.prize_amount > 0 ? `🍫 +${h.prize_amount.toLocaleString('es-CO')} pts` : '🍫 Otra vez'}
              </p>
```

- [ ] **Step 3: Verificar que el proyecto compila y los tests pasan**

Run: `cd "C:\Users\Estudiante\Documents\kuma-axis" && npm run build && npm test`

Expected: ambos comandos exitosos.

- [ ] **Step 4: Commit**

```bash
git add components/RouletteClient.tsx
git commit -m "feat: relabel roulette prizes as loyalty points"
```

---

### Task 11: Aplicar las migraciones en Supabase (acción del usuario)

Esta tarea no la ejecuta el agente — requiere que el usuario aplique las
3 migraciones SQL en su proyecto de Supabase, en este orden, igual que con
las migraciones anteriores (0008/0009/0010).

- [ ] **Step 1: Aplicar `0011_loyalty_points.sql`**

En el SQL Editor de Supabase, pegar y ejecutar el contenido completo de
`supabase/migrations/0011_loyalty_points.sql`. Esperado: "Success. No rows
returned".

- [ ] **Step 2: Aplicar `0012_redeem_rewards.sql`**

Pegar y ejecutar el contenido completo de
`supabase/migrations/0012_redeem_rewards.sql`. Esperado: "Success. No rows
returned".

- [ ] **Step 3: Aplicar `0013_apply_vouchers.sql`**

Pegar y ejecutar el contenido completo de
`supabase/migrations/0013_apply_vouchers.sql`. Esperado: "Success. No rows
returned".

- [ ] **Step 4: Confirmar al agente**

Una vez aplicadas las 3, avisar (puede ser con una captura de pantalla de
"Success. No rows returned" de la última) para continuar con el deploy a
Vercel.

---

## Resumen de archivos nuevos/modificados

- `supabase/migrations/0011_loyalty_points.sql` (nuevo)
- `supabase/migrations/0012_redeem_rewards.sql` (nuevo)
- `supabase/migrations/0013_apply_vouchers.sql` (nuevo)
- `lib/constants.ts` (modificado — `REWARD_CATALOG`)
- `lib/constants.test.ts` (modificado — tests del catálogo)
- `lib/types.ts` (modificado — `Wallet.loyalty_points_balance`,
  `RewardVoucher`, `RewardRedemption`)
- `lib/actions/rewards.ts` (nuevo — `redeemReward`)
- `lib/actions/orders.ts` (modificado — `createOrder`,
  `purchaseWithBalance` con `voucherId`)
- `components/RewardCatalog.tsx` (nuevo)
- `components/LoyaltyPointsCard.tsx` (nuevo)
- `components/PurchaseForm.tsx` (modificado — cupones)
- `components/RouletteClient.tsx` (modificado — mensajes)
- `app/(dashboard)/billetera/canjear/page.tsx` (nuevo)
- `app/(dashboard)/billetera/page.tsx` (modificado — dos tarjetas)
- `app/(dashboard)/tienda/comprar/[code]/page.tsx` (modificado — pasa
  `voucher` a `PurchaseForm`)
