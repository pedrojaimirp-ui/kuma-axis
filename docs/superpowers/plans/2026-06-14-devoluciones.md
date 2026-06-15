# Devoluciones (Derecho de retracto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "derecho de retracto" flow (Ley 1480 de 2011): admin marks paid orders as delivered, customers can request a return within 5 business days of delivery with a mandatory reason, and admin can approve (refunding `price - shipping_cost` to the customer's available balance) or reject the request.

**Architecture:** One SQL migration adds `packages.shipping_cost`, new `orders` statuses (`delivered`/`returned`) + `delivered_at`, the `return_requests` table, a new `wallet_transactions` type (`return_refund`), and five `security definer` RPCs (`business_days_between`, `mark_order_delivered`, `request_return`, `approve_return`, `reject_return`). The frontend adds TS types, two server actions in `lib/actions/admin.ts` and one in `lib/actions/orders.ts`, a small `lib/dates.ts` helper (TS mirror of `business_days_between` for UI display), two new admin row components, and a return-request form component used in "Mis pedidos".

**Tech Stack:** Supabase Postgres (SQL migration, `security definer` RPCs), Next.js 14 App Router server actions, React Server/Client Components, Vitest.

---

## File Structure

- Create: `supabase/migrations/0015_devoluciones.sql` — `packages.shipping_cost`, `orders` status/`delivered_at`, `return_requests` table + RLS, `wallet_transactions` type update, RPCs (`business_days_between`, `mark_order_delivered`, `request_return`, `approve_return`, `reject_return`).
- Modify: `lib/types.ts` (currently 153 lines) — extend `OrderStatus`, `Order`, `WalletTransactionType`, `Package`; add `ReturnRequest`, `AdminReturnRequest`.
- Create: `lib/dates.ts` — `businessDaysBetween(from, to)` TS helper for the UI.
- Create: `lib/dates.test.ts` — Vitest tests for `businessDaysBetween`.
- Modify: `lib/actions/admin.ts` (currently 47 lines) — add `markOrderDelivered`, `reviewReturn`.
- Modify: `lib/actions/orders.ts` — add `requestReturn`.
- Create: `components/AdminPaidOrderRow.tsx` — "Marcar como entregado" row for `paid` orders.
- Create: `components/AdminReturnRow.tsx` — "Aprobar"/"Rechazar" row for pending `return_requests`.
- Modify: `app/admin/page.tsx` (currently 79 lines) — query paid orders + pending return requests, render new sections.
- Create: `components/RequestReturnForm.tsx` — "Solicitar devolución" button + reason textarea, calls `requestReturn`.
- Modify: `app/(dashboard)/tienda/pedidos/page.tsx` (currently 49 lines) — new status labels, return-request UI.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/0015_devoluciones.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 0015_devoluciones.sql --------------------------------------------------------
-- Derecho de retracto / devoluciones (Ley 1480 de 2011): el cliente puede
-- solicitar la devolución de un pedido entregado dentro de los 5 días
-- hábiles siguientes a la entrega. El admin marca la entrega y revisa la
-- solicitud; si la aprueba, se acredita al saldo disponible el precio del
-- paquete menos el costo de envío (no reembolsable).

-- packages: costo de envío (no reembolsable) ------------------------------------
alter table public.packages add column shipping_cost numeric not null default 0;

update public.packages set shipping_cost = 10000 where code = 'kuma1';
update public.packages set shipping_cost = 15000 where code = 'kuma2';
update public.packages set shipping_cost = 20000 where code = 'kuma3';

-- orders: nuevos estados 'delivered'/'returned' + fecha de entrega --------------
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending_payment', 'paid', 'rejected', 'delivered', 'returned'));

alter table public.orders add column delivered_at timestamptz;

-- return_requests: solicitudes de devolución -------------------------------------
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  user_id uuid not null references public.profiles (id),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.return_requests enable row level security;

create policy "return_requests_select_own_or_admin" on public.return_requests
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

-- wallet_transactions: nuevo tipo 'return_refund' ----------------------------------
alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'commission_l1', 'commission_l2', 'commission_l3', 'commission_l4',
    'owner_global', 'unlock', 'purchase_with_balance',
    'withdrawal_request', 'withdrawal_rejected', 'roulette_prize',
    'return_refund'
  ));

-- business_days_between: cuenta los días hábiles (lunes a viernes) entre dos
-- fechas, sin contar festivos colombianos (fuera de alcance).
create function public.business_days_between(p_from timestamptz, p_to timestamptz)
returns int as $$
declare
  v_day date := (p_from at time zone 'utc')::date;
  v_end date := (p_to at time zone 'utc')::date;
  v_count int := 0;
begin
  while v_day < v_end loop
    v_day := v_day + 1;
    if extract(isodow from v_day) < 6 then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$ language plpgsql set search_path = public;

grant execute on function public.business_days_between(timestamptz, timestamptz) to authenticated;

-- mark_order_delivered: solo admin/owner, pedido debe estar 'paid' ----------------
create function public.mark_order_delivered(p_order_id uuid)
returns void as $$
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  update public.orders
    set status = 'delivered', delivered_at = now()
    where id = p_order_id and status = 'paid';

  if not found then
    raise exception 'Pedido no encontrado o no está en estado pagado';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.mark_order_delivered(uuid) to authenticated;

-- request_return: el cliente solicita devolución de un pedido entregado ----------
create function public.request_return(p_order_id uuid, p_reason text)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_delivered_at timestamptz;
  v_existing int;
  v_id uuid;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Debes indicar un motivo para la devolución';
  end if;

  select status, delivered_at into v_status, v_delivered_at
    from public.orders
    where id = p_order_id and user_id = v_user_id;

  if v_status is null then
    raise exception 'Pedido no encontrado';
  end if;

  if v_status <> 'delivered' then
    raise exception 'Solo se puede solicitar devolución de pedidos entregados';
  end if;

  select count(*) into v_existing
    from public.return_requests
    where order_id = p_order_id and status in ('pending', 'approved');

  if v_existing > 0 then
    raise exception 'Ya existe una solicitud de devolución para este pedido';
  end if;

  if public.business_days_between(v_delivered_at, now()) > 5 then
    raise exception 'Ya pasaron los 5 días hábiles para solicitar la devolución de este pedido';
  end if;

  insert into public.return_requests (order_id, user_id, reason)
  values (p_order_id, v_user_id, p_reason)
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_return(uuid, text) to authenticated;

-- approve_return: admin aprueba, acredita precio - envío al saldo disponible ------
create function public.approve_return(p_return_id uuid)
returns void as $$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_price numeric;
  v_shipping numeric;
  v_refund numeric;
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  select order_id, user_id into v_order_id, v_user_id
    from public.return_requests
    where id = p_return_id and status = 'pending'
    for update;

  if v_order_id is null then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  select p.price, p.shipping_cost into v_price, v_shipping
    from public.orders o
    join public.packages p on p.id = o.package_id
    where o.id = v_order_id;

  v_refund := v_price - v_shipping;

  update public.return_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_return_id;

  update public.orders set status = 'returned' where id = v_order_id;

  update public.wallets
    set balance_available = balance_available + v_refund, updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, related_order_id, description)
  values (v_user_id, v_refund, 'return_refund', 'available', v_order_id, 'Reembolso por devolución de pedido (envío no reembolsable)');
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.approve_return(uuid) to authenticated;

-- reject_return: admin rechaza, no mueve dinero ni cambia el pedido ---------------
create function public.reject_return(p_return_id uuid)
returns void as $$
declare
  v_id uuid;
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  select id into v_id
    from public.return_requests
    where id = p_return_id and status = 'pending'
    for update;

  if v_id is null then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  update public.return_requests
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_return_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.reject_return(uuid) to authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0015_devoluciones.sql
git commit -m "feat: migración 0015 - devoluciones (shipping_cost, return_requests, RPCs)"
```

> Nota para el usuario: esta migración se aplica pegando el contenido del archivo en el SQL Editor de Supabase, igual que las anteriores (0001-0014).

---

### Task 2: TypeScript types

**Files:**
- Modify: `lib/types.ts:33` (`OrderStatus`)
- Modify: `lib/types.ts:7-18` (`Package`)
- Modify: `lib/types.ts:42-53` (`Order`)
- Modify: `lib/types.ts:72-83` (`WalletTransactionType`)
- Modify: `lib/types.ts` (end of file) — add `ReturnRequest`, `AdminReturnRequest`

- [ ] **Step 1: Extend `OrderStatus` and `Order`**

In `lib/types.ts:33`, replace:

```ts
export type OrderStatus = 'pending_payment' | 'paid' | 'rejected'
```

with:

```ts
export type OrderStatus = 'pending_payment' | 'paid' | 'rejected' | 'delivered' | 'returned'
```

In `lib/types.ts:42-53`, the `Order` interface currently ends with `created_at: string`. Add `delivered_at` right after `reviewed_at`:

```ts
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
  delivered_at: string | null
  created_at: string
}
```

- [ ] **Step 2: Add `shipping_cost` to `Package`**

In `lib/types.ts:7-18`, add `shipping_cost: number` after `price: number`:

```ts
export interface Package {
  id: string
  code: PackageCode
  name: string
  price: number
  shipping_cost: number
  bags: number
  commissions_json: Record<string, number>
  daily_spins: number
  referral_spins: number
  activation_requirement: ActivationRequirement | null
  max_direct_referrals: number | null
}
```

- [ ] **Step 3: Add `'return_refund'` to `WalletTransactionType`**

In `lib/types.ts:72-83`, replace:

```ts
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
  | 'roulette_prize'
```

with:

```ts
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
  | 'roulette_prize'
  | 'return_refund'
```

- [ ] **Step 4: Add `ReturnRequest` and `AdminReturnRequest` types**

At the end of `lib/types.ts`, append:

```ts

export type ReturnRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ReturnRequest {
  id: string
  order_id: string
  user_id: string
  reason: string
  status: ReturnRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminReturnRequest {
  id: string
  reason: string
  created_at: string
  orders: { id: string; packages: { name: string } | null } | null
  profiles: { full_name: string; phone: string } | null
}
```

- [ ] **Step 5: Verify the project still type-checks**

Run: `npm run build`
Expected: build succeeds (no type errors). It's fine if other files don't use the new fields yet.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts
git commit -m "feat: tipos para devoluciones (OrderStatus, Package.shipping_cost, ReturnRequest)"
```

---

### Task 3: `business_days_between` TS helper + tests

**Files:**
- Create: `lib/dates.ts`
- Create: `lib/dates.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { businessDaysBetween } from './dates'

describe('businessDaysBetween', () => {
  it('returns 0 for the same day', () => {
    const day = new Date('2026-06-15T10:00:00Z') // Monday
    expect(businessDaysBetween(day, day)).toBe(0)
  })

  it('counts only weekdays across a weekend', () => {
    const friday = new Date('2026-06-12T10:00:00Z')
    const monday = new Date('2026-06-15T10:00:00Z')
    expect(businessDaysBetween(friday, monday)).toBe(1)
  })

  it('returns 5 for exactly 5 business days later', () => {
    const monday = new Date('2026-06-15T10:00:00Z')
    const nextMonday = new Date('2026-06-22T10:00:00Z')
    expect(businessDaysBetween(monday, nextMonday)).toBe(5)
  })

  it('returns more than 5 when over the limit', () => {
    const monday = new Date('2026-06-15T10:00:00Z')
    const tuesdayAfter = new Date('2026-06-23T10:00:00Z')
    expect(businessDaysBetween(monday, tuesdayAfter)).toBe(6)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/dates.test.ts`
Expected: FAIL with "Failed to resolve import './dates'" (file doesn't exist yet)

- [ ] **Step 3: Implement `businessDaysBetween`**

Create `lib/dates.ts`:

```ts
// Cuenta los días hábiles (lunes a viernes) entre dos fechas, sin contar el
// día inicial. Espejo en TypeScript de la función SQL business_days_between,
// usado para mostrar "te quedan N días" en la interfaz.
export function businessDaysBetween(from: Date, to: Date): number {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))

  let count = 0
  const day = new Date(start)
  while (day < end) {
    day.setUTCDate(day.getUTCDate() + 1)
    const dow = day.getUTCDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/dates.test.ts`
Expected: PASS (4/4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/dates.ts lib/dates.test.ts
git commit -m "feat: helper businessDaysBetween + tests"
```

---

### Task 4: Admin server actions (`markOrderDelivered`, `reviewReturn`)

**Files:**
- Modify: `lib/actions/admin.ts:47` (end of file)

- [ ] **Step 1: Add `markOrderDelivered` and `reviewReturn`**

Append to `lib/actions/admin.ts`:

```ts

export async function markOrderDelivered(orderId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.rpc('mark_order_delivered', { p_order_id: orderId })

  if (error) {
    console.error('mark_order_delivered failed:', error.message)
    throw new Error('No se pudo marcar el pedido como entregado.')
  }
}

export async function reviewReturn(returnId: string, status: 'approved' | 'rejected') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const fn = status === 'approved' ? 'approve_return' : 'reject_return'
  const { error } = await supabase.rpc(fn, { p_return_id: returnId })

  if (error) {
    console.error(`${fn} failed:`, error.message)
    throw new Error('No se pudo actualizar la solicitud de devolución.')
  }
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/admin.ts
git commit -m "feat: server actions markOrderDelivered y reviewReturn"
```

---

### Task 5: Customer server action (`requestReturn`)

**Files:**
- Modify: `lib/actions/orders.ts` (end of file)

- [ ] **Step 1: Add `requestReturn`**

Append to `lib/actions/orders.ts`:

```ts

export async function requestReturn(orderId: string, reason: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    throw new Error('Debes indicar un motivo para la devolución.')
  }

  const { error } = await supabase.rpc('request_return', {
    p_order_id: orderId,
    p_reason: trimmedReason,
  })

  if (error) {
    console.error('request_return failed:', error.message)
    throw new Error(error.message)
  }
}
```

> `request_return` ya valida en la base de datos (pedido entregado, sin
> solicitud previa, dentro de los 5 días hábiles) y lanza un mensaje claro con
> `raise exception` — por eso aquí se propaga `error.message` directamente en
> vez de un mensaje genérico.

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/orders.ts
git commit -m "feat: server action requestReturn"
```

---

### Task 6: Admin panel — marcar pedidos como entregados

**Files:**
- Create: `components/AdminPaidOrderRow.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Create `AdminPaidOrderRow`**

Create `components/AdminPaidOrderRow.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { markOrderDelivered } from '@/lib/actions/admin'
import type { AdminOrder } from '@/lib/types'

export function AdminPaidOrderRow({ order }: { order: AdminOrder }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelivered() {
    setLoading(true)
    setError(null)
    try {
      await markOrderDelivered(order.id)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (done) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-cacao-oscuro">
        {order.profiles?.full_name} · {order.profiles?.phone}
      </p>
      <p className="text-sm text-cacao-tostado">
        {order.packages?.name} · ${order.packages ? Number(order.packages.price).toLocaleString('es-CO') : ''}
      </p>
      <p className="text-sm text-cacao-tostado">
        {order.shipping_address.calle}, {order.shipping_address.ciudad},{' '}
        {order.shipping_address.departamento} · Tel: {order.shipping_address.telefono}
      </p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleDelivered}
          disabled={loading}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Marcar como entregado'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Query paid orders and render the new section**

In `app/admin/page.tsx`, add the import at the top (after the existing imports):

```ts
import { AdminPaidOrderRow } from '@/components/AdminPaidOrderRow'
```

After the existing `orders` query (the `pending_payment` one, `app/admin/page.tsx:26-34`), add a second query:

```ts
  const { data: paidOrders, error: paidOrdersError } = await supabase
    .from('orders')
    .select('id, created_at, shipping_address, payment_reference, profiles!orders_user_id_fkey(full_name, phone), packages(name, price)')
    .eq('status', 'paid')
    .order('created_at', { ascending: true })

  if (paidOrdersError) {
    console.error('paid orders select failed:', paidOrdersError.message)
  }
```

Then, after the "Pedidos pendientes" `<div className="space-y-3">...</div>` block (`app/admin/page.tsx:59-64`), add a new section:

```tsx
      <h1 className="mb-4 mt-6 text-xl font-bold text-cacao-oscuro">Pedidos pagados por entregar</h1>
      <div className="space-y-3">
        {!paidOrders?.length && <p className="text-cacao-tostado">No hay pedidos pagados pendientes de entrega.</p>}
        {(paidOrders as unknown as AdminOrder[] | null)?.map((order) => (
          <AdminPaidOrderRow key={order.id} order={order} />
        ))}
      </div>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds, `/admin` route compiles.

- [ ] **Step 4: Commit**

```bash
git add components/AdminPaidOrderRow.tsx app/admin/page.tsx
git commit -m "feat: admin puede marcar pedidos pagados como entregados"
```

---

### Task 7: Admin panel — sección "Devoluciones pendientes"

**Files:**
- Create: `components/AdminReturnRow.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Create `AdminReturnRow`**

Create `components/AdminReturnRow.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { reviewReturn } from '@/lib/actions/admin'
import type { AdminReturnRequest } from '@/lib/types'

export function AdminReturnRow({ request }: { request: AdminReturnRequest }) {
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReview(status: 'approved' | 'rejected') {
    setLoading(status)
    setError(null)
    try {
      await reviewReturn(request.id, status)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(null)
    }
  }

  if (done) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-cacao-oscuro">
        {request.profiles?.full_name} · {request.profiles?.phone}
      </p>
      <p className="text-sm text-cacao-tostado">
        Paquete: {request.orders?.packages?.name ?? '—'}
      </p>
      <p className="text-sm text-cacao-tostado">Motivo: {request.reason}</p>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => handleReview('approved')}
          disabled={loading !== null}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading === 'approved' ? 'Guardando...' : 'Aprobar'}
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

- [ ] **Step 2: Query pending return requests and render the new section**

In `app/admin/page.tsx`, add the import:

```ts
import { AdminReturnRow } from '@/components/AdminReturnRow'
```

After the `paidOrders` query added in Task 6, add:

```ts
  const { data: returnRequests, error: returnRequestsError } = await supabase
    .from('return_requests')
    .select('id, reason, created_at, orders(id, packages(name)), profiles!return_requests_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (returnRequestsError) {
    console.error('return_requests select failed:', returnRequestsError.message)
  }
```

Then, after the "Pedidos pagados por entregar" section added in Task 6, add:

```tsx
      <h1 className="mb-4 mt-6 text-xl font-bold text-cacao-oscuro">Devoluciones pendientes</h1>
      <div className="space-y-3">
        {!returnRequests?.length && <p className="text-cacao-tostado">No hay devoluciones pendientes.</p>}
        {(returnRequests as unknown as AdminReturnRequest[] | null)?.map((r) => (
          <AdminReturnRow key={r.id} request={r} />
        ))}
      </div>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds, `/admin` route compiles.

- [ ] **Step 4: Commit**

```bash
git add components/AdminReturnRow.tsx app/admin/page.tsx
git commit -m "feat: admin puede aprobar/rechazar devoluciones"
```

---

### Task 8: Mis pedidos — solicitar devolución

**Files:**
- Create: `components/RequestReturnForm.tsx`
- Modify: `app/(dashboard)/tienda/pedidos/page.tsx`

- [ ] **Step 1: Create `RequestReturnForm`**

Create `components/RequestReturnForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { requestReturn } from '@/lib/actions/orders'

export function RequestReturnForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      await requestReturn(orderId, reason)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return <p className="text-sm font-semibold text-kuma-dorado">Devolución solicitada, en revisión</p>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-kuma-dorado px-3 py-1 text-sm font-semibold text-cacao-oscuro"
      >
        Solicitar devolución
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Cuéntanos el motivo de la devolución"
        className="w-full rounded-lg border border-cacao-tostado/30 p-2 text-sm"
        rows={3}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !reason.trim()}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded-lg bg-cacao-tostado/20 px-3 py-1 text-sm font-semibold text-cacao-oscuro disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update "Mis pedidos" page**

Replace the full content of `app/(dashboard)/tienda/pedidos/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RequestReturnForm } from '@/components/RequestReturnForm'
import { businessDaysBetween } from '@/lib/dates'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'Pendiente de verificación', className: 'text-kuma-dorado' },
  paid: { label: 'Pagado', className: 'text-verde-natural' },
  rejected: { label: 'Rechazado', className: 'text-red-600' },
  delivered: { label: 'Entregado', className: 'text-verde-natural' },
  returned: { label: 'Devuelto', className: 'text-cacao-tostado' },
}

export default async function PedidosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, created_at, delivered_at, packages(name, price)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('orders select failed:', ordersError.message)
  }

  const { data: returnRequests, error: returnRequestsError } = await supabase
    .from('return_requests')
    .select('order_id, status')
    .eq('user_id', user.id)

  if (returnRequestsError) {
    console.error('return_requests select failed:', returnRequestsError.message)
  }

  const pendingReturnOrderIds = new Set(
    (returnRequests ?? []).filter((r) => r.status === 'pending').map((r) => r.order_id)
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Mis pedidos</h1>
      {!orders?.length && <p className="text-cacao-tostado">Aún no tienes pedidos.</p>}
      {orders?.map((order) => {
        const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending_payment
        const pkg = order.packages as unknown as { name: string; price: number } | null

        const canRequestReturn =
          order.status === 'delivered' &&
          order.delivered_at !== null &&
          !pendingReturnOrderIds.has(order.id) &&
          businessDaysBetween(new Date(order.delivered_at), new Date()) <= 5

        return (
          <div key={order.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-cacao-oscuro">{pkg?.name}</p>
                <p className="text-sm text-cacao-tostado">
                  ${pkg ? Number(pkg.price).toLocaleString('es-CO') : '—'} ·{' '}
                  {new Date(order.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
              <span className={`text-sm font-semibold ${status.className}`}>{status.label}</span>
            </div>
            {pendingReturnOrderIds.has(order.id) && (
              <p className="mt-2 text-sm font-semibold text-kuma-dorado">Devolución solicitada, en revisión</p>
            )}
            {canRequestReturn && (
              <div className="mt-2">
                <RequestReturnForm orderId={order.id} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds, `/tienda/pedidos` route compiles.

- [ ] **Step 4: Commit**

```bash
git add components/RequestReturnForm.tsx "app/(dashboard)/tienda/pedidos/page.tsx"
git commit -m "feat: clientes pueden solicitar devolución desde Mis pedidos"
```

---

### Task 9: Verificación final

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the 4 new `businessDaysBetween` tests (25/25 total).

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: build succeeds, including `/admin` and `/tienda/pedidos` routes.

- [ ] **Step 3: Write the migration guide note for the user**

No code change — at the end of this task, tell the user (in chat, in Spanish, step by step) how to apply `supabase/migrations/0015_devoluciones.sql` in the Supabase SQL Editor, exactly like migration 0014: open the Supabase dashboard → SQL Editor → New query → paste the full file contents → Run → confirm "Success. No rows returned".

---

## Self-Review Notes

- **Spec coverage:** decisions 1-5 → Tasks 1, 6, 7, 8. `packages.shipping_cost` + values → Task 1. `orders` status/`delivered_at` → Task 1. `return_requests` + RLS → Task 1. All 5 RPCs → Task 1. `wallet_transactions` type → Task 1. UI (admin "marcar entregado", "Devoluciones pendientes", "Mis pedidos" labels + request form) → Tasks 6-8. `business_days_between` Vitest tests → Task 3.
- **Out of scope confirmed:** Colombian holidays, notifications, automatic packaging checks, commission reversal — none of these appear in any task.
- **Type consistency:** `AdminReturnRequest.orders.packages.name` (Task 2) matches the `orders(id, packages(name))` embed in Task 7's query and `request.orders?.packages?.name` in `AdminReturnRow`. `ReturnRequest.status` (`'pending' | 'approved' | 'rejected'`) matches the `return_requests.status` check constraint in Task 1 and the filter in Task 8. `businessDaysBetween(from, to)` signature (Task 3) matches its usage in Task 8.
