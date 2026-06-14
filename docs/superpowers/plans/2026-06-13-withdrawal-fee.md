# Withdrawal Sustainability Fee (5%) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Charge a 5% platform-sustainability fee on every approved withdrawal, show the fee/net breakdown transparently to the user and the admin, and accumulate the total collected fees for the owner to see.

**Architecture:** A SQL migration adds two columns to `withdrawal_requests` (`fee_amount`, `net_amount`), a column to `platform_settings` (`withdrawal_fees_accumulated`), updates `request_withdrawal` to compute the breakdown, and adds a new `approve_withdrawal` RPC that the admin action calls instead of a raw `update`. The frontend gets a small pure helper (`calculateWithdrawalFee`) used for a live preview in `WithdrawalForm`, and the admin page/row are updated to display the breakdown and the accumulated total.

**Tech Stack:** Next.js 14 (App Router), Supabase (Postgres + RLS), TypeScript, Vitest

**Reference spec:** `docs/superpowers/specs/2026-06-13-withdrawal-fee-design.md`

---

## Task 1: Fee calculation helper (TDD)

**Files:**
- Create: `lib/constants.ts`
- Create: `lib/constants.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WITHDRAWAL_FEE_PERCENT, calculateWithdrawalFee } from './constants'

describe('WITHDRAWAL_FEE_PERCENT', () => {
  it('is 5', () => {
    expect(WITHDRAWAL_FEE_PERCENT).toBe(5)
  })
})

describe('calculateWithdrawalFee', () => {
  it('computes 5% fee and net for a round amount', () => {
    expect(calculateWithdrawalFee(10000)).toEqual({ fee: 500, net: 9500 })
  })

  it('rounds the fee to the nearest peso', () => {
    expect(calculateWithdrawalFee(33)).toEqual({ fee: 2, net: 31 })
  })

  it('returns zero fee and net for zero amount', () => {
    expect(calculateWithdrawalFee(0)).toEqual({ fee: 0, net: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/constants.test.ts`
Expected: FAIL with "Failed to resolve import './constants'" or "does not provide an export named 'WITHDRAWAL_FEE_PERCENT'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/constants.ts`:

```ts
export const WITHDRAWAL_FEE_PERCENT = 5

export function calculateWithdrawalFee(amount: number): { fee: number; net: number } {
  const fee = Math.round((amount * WITHDRAWAL_FEE_PERCENT) / 100)
  return { fee, net: amount - fee }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/constants.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts lib/constants.test.ts
git commit -m "feat: add withdrawal fee calculation helper"
```

---

## Task 2: TypeScript types for fee breakdown

**Files:**
- Modify: `lib/types.ts:95-112`

- [ ] **Step 1: Update `WithdrawalRequest` and `AdminWithdrawal` interfaces**

In `lib/types.ts`, find:

```ts
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

Replace with:

```ts
export interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  fee_amount: number
  net_amount: number
  destination: string
  status: WithdrawalStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminWithdrawal {
  id: string
  amount: number
  fee_amount: number
  net_amount: number
  destination: string
  created_at: string
  profiles: { full_name: string; phone: string } | null
}
```

- [ ] **Step 2: Run the typecheck**

Run: `npx tsc --noEmit`
Expected: New errors in `app/admin/page.tsx` and `components/AdminWithdrawalRow.tsx` are OK at this point (fixed in later tasks). No errors should appear in files outside those two yet — if they do, stop and investigate before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add fee_amount/net_amount to withdrawal types"
```

---

## Task 3: Database migration — schema + functions

**Files:**
- Create: `supabase/migrations/0004_withdrawal_fee.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0004_withdrawal_fee.sql`:

```sql
-- Withdrawal sustainability fee (5%) -------------------------------------------

-- 1. Track accumulated platform fees
alter table public.platform_settings
  add column withdrawal_fees_accumulated numeric not null default 0;

-- 2. Store the fee/net breakdown on each withdrawal request
alter table public.withdrawal_requests
  add column fee_amount numeric not null default 0,
  add column net_amount numeric not null default 0;

-- 3. request_withdrawal now computes and stores the 5% fee breakdown
create or replace function public.request_withdrawal(p_amount numeric, p_destination text)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
  v_fee numeric;
  v_net numeric;
begin
  if p_amount <= 0 then
    raise exception 'Monto inválido';
  end if;

  select balance_available into v_balance
    from public.wallets where user_id = v_user_id for update;

  if v_balance < p_amount then
    raise exception 'Saldo insuficiente';
  end if;

  v_fee := round(p_amount * 0.05);
  v_net := p_amount - v_fee;

  update public.wallets
    set balance_available = balance_available - p_amount, updated_at = now()
    where user_id = v_user_id;

  insert into public.withdrawal_requests (user_id, amount, destination, fee_amount, net_amount)
  values (v_user_id, p_amount, p_destination, v_fee, v_net)
  returning id into v_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, related_withdrawal_id, description)
  values (v_user_id, -p_amount, 'withdrawal_request', 'available', v_id, 'Solicitud de retiro');

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_withdrawal(numeric, text) to authenticated;

-- 4. approve_withdrawal: marks a withdrawal as paid and accumulates its fee
create function public.approve_withdrawal(p_id uuid)
returns void as $$
declare
  v_fee numeric;
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  select fee_amount into v_fee
    from public.withdrawal_requests
    where id = p_id and status = 'pending'
    for update;

  if v_fee is null then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  update public.withdrawal_requests
    set status = 'paid', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;

  update public.platform_settings
    set withdrawal_fees_accumulated = withdrawal_fees_accumulated + v_fee
    where id = 1;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.approve_withdrawal(uuid) to authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0004_withdrawal_fee.sql
git commit -m "feat: add withdrawal fee migration (columns + approve_withdrawal RPC)"
```

- [ ] **Step 3: Apply the migration in Supabase (manual — guide the user)**

This step is run by the non-technical project owner in the Supabase Dashboard, not by the engineer locally. Provide these exact instructions:

1. Ve a Supabase → tu proyecto → **SQL Editor** → **New query**.
2. Pega el contenido completo de `supabase/migrations/0004_withdrawal_fee.sql`.
3. Haz clic en **Run**.
4. Verifica que no haya errores en rojo. Debe decir algo como "Success. No rows returned".

To verify the migration applied correctly, run this follow-up query in the SQL Editor:

```sql
select withdrawal_fees_accumulated from public.platform_settings where id = 1;
```

Expected: one row showing `withdrawal_fees_accumulated = 0`.

---

## Task 4: WithdrawalForm — live fee preview

**Files:**
- Modify: `components/WithdrawalForm.tsx`

- [ ] **Step 1: Add the import and preview line**

In `components/WithdrawalForm.tsx`, add the import at the top:

```tsx
import { calculateWithdrawalFee, WITHDRAWAL_FEE_PERCENT } from '@/lib/constants'
```

Then, inside the form (the `open` branch), add a preview paragraph right after the "Monto a retirar" `<input>` block. The input block currently is:

```tsx
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
```

Replace it with:

```tsx
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
        {Number(amount) > 0 && (
          <p className="mt-1 text-sm text-cacao-tostado">
            Recibirás ${calculateWithdrawalFee(Number(amount)).net.toLocaleString('es-CO')} — se
            retiene {WITHDRAWAL_FEE_PERCENT}% (${calculateWithdrawalFee(Number(amount)).fee.toLocaleString('es-CO')}) para sostenimiento de la plataforma.
          </p>
        )}
      </div>
```

- [ ] **Step 2: Run the typecheck**

Run: `npx tsc --noEmit`
Expected: No errors in `components/WithdrawalForm.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/WithdrawalForm.tsx
git commit -m "feat: show withdrawal fee preview in WithdrawalForm"
```

---

## Task 5: Admin review action — use approve_withdrawal RPC

**Files:**
- Modify: `lib/actions/admin.ts:27-56`

- [ ] **Step 1: Replace the `paid` branch of `reviewWithdrawal`**

In `lib/actions/admin.ts`, find:

```ts
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

Replace with:

```ts
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

  const { error } = await supabase.rpc('approve_withdrawal', { p_id: id })
  if (error) {
    console.error('approve_withdrawal failed:', error.message)
    throw new Error('No se pudo actualizar el retiro.')
  }
}
```

Note: `user` is no longer used directly in the `paid` branch (the RPC uses `auth.uid()` internally), but it's still needed for the `if (!user) throw ...` guard at the top, so the variable stays.

- [ ] **Step 2: Run the typecheck**

Run: `npx tsc --noEmit`
Expected: No errors in `lib/actions/admin.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/actions/admin.ts
git commit -m "feat: use approve_withdrawal RPC for withdrawal approval"
```

---

## Task 6: Admin withdrawal row — show fee breakdown

**Files:**
- Modify: `components/AdminWithdrawalRow.tsx:30-33`

- [ ] **Step 1: Replace the amount line with the full breakdown**

In `components/AdminWithdrawalRow.tsx`, find:

```tsx
      <p className="text-sm text-cacao-tostado">
        Monto: <span className="font-bold text-kuma-dorado">${Number(withdrawal.amount).toLocaleString('es-CO')}</span>
      </p>
      <p className="text-sm text-cacao-tostado">Destino: {withdrawal.destination}</p>
```

Replace with:

```tsx
      <p className="text-sm text-cacao-tostado">
        Monto solicitado: <span className="font-bold text-kuma-dorado">${Number(withdrawal.amount).toLocaleString('es-CO')}</span>
      </p>
      <p className="text-sm text-cacao-tostado">
        Comisión plataforma (5%): ${Number(withdrawal.fee_amount).toLocaleString('es-CO')}
      </p>
      <p className="text-sm text-cacao-tostado">
        Neto a transferir: <span className="font-bold text-verde-natural">${Number(withdrawal.net_amount).toLocaleString('es-CO')}</span>
      </p>
      <p className="text-sm text-cacao-tostado">Destino: {withdrawal.destination}</p>
```

- [ ] **Step 2: Run the typecheck**

Run: `npx tsc --noEmit`
Expected: No errors in `components/AdminWithdrawalRow.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/AdminWithdrawalRow.tsx
git commit -m "feat: show fee/net breakdown on admin withdrawal rows"
```

---

## Task 7: Admin page — withdrawal query + accumulated fees summary

**Files:**
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Add `fee_amount, net_amount` to the withdrawals query and add the platform_settings query**

In `app/admin/page.tsx`, find:

```ts
  const { data: withdrawals, error: withdrawalsError } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, destination, created_at, profiles!withdrawal_requests_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (withdrawalsError) {
    console.error('withdrawal_requests select failed:', withdrawalsError.message)
  }
```

Replace with:

```ts
  const { data: withdrawals, error: withdrawalsError } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, fee_amount, net_amount, destination, created_at, profiles!withdrawal_requests_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (withdrawalsError) {
    console.error('withdrawal_requests select failed:', withdrawalsError.message)
  }

  const { data: settings, error: settingsError } = await supabase
    .from('platform_settings')
    .select('withdrawal_fees_accumulated')
    .eq('id', 1)
    .single()

  if (settingsError) {
    console.error('platform_settings select failed:', settingsError.message)
  }
```

- [ ] **Step 2: Render the accumulated fees summary above "Retiros pendientes"**

Find:

```tsx
      <h1 className="mb-4 mt-6 text-xl font-bold text-cacao-oscuro">Retiros pendientes</h1>
```

Replace with:

```tsx
      <p className="mb-2 mt-6 text-sm font-semibold text-cacao-tostado">
        💰 Fondos de sostenimiento acumulados: ${Number(settings?.withdrawal_fees_accumulated ?? 0).toLocaleString('es-CO')}
      </p>
      <h1 className="mb-4 text-xl font-bold text-cacao-oscuro">Retiros pendientes</h1>
```

- [ ] **Step 3: Run the typecheck**

Run: `npx tsc --noEmit`
Expected: No errors anywhere

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: show accumulated withdrawal fees in admin panel"
```

---

## Task 8: Build, deploy, and guided E2E verification

**Files:** none (build + deploy + manual verification)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass, including the 4 new tests from Task 1.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: Build completes with no type errors.

- [ ] **Step 3: Confirm the SQL migration from Task 3 was applied**

Before deploying, confirm with the user that they already ran `supabase/migrations/0004_withdrawal_fee.sql` in the Supabase SQL Editor (Task 3, Step 3) and got "Success". If not done yet, do it now — deploying code that calls `approve_withdrawal` before the function exists in the database will break the "Marcar pagado" button.

- [ ] **Step 4: Deploy to production**

Run: `vercel --prod --yes`
Expected: Deployment succeeds with `"readyState": "READY"` and `"target": "production"`.

- [ ] **Step 5: Guided E2E verification (Spanish, step-by-step for the non-technical user)**

Walk the user through this flow in the browser:

1. Inicia sesión como PEDRO (`3213586024`) y ve a `https://kuma-axis.vercel.app/billetera`.
2. Haz clic en **"Solicitar retiro"**, escribe `5000` en "Monto a retirar".
   - Verificar: aparece el texto "Recibirás $4.750 — se retiene 5% ($250) para sostenimiento de la plataforma."
3. Escribe un destino (ej: `Nequi 3213586024`) y haz clic en **"Confirmar solicitud"**.
4. Ve a `https://kuma-axis.vercel.app/admin`.
   - Verificar: la nueva solicitud muestra "Monto solicitado: $5.000 / Comisión plataforma (5%): $250 / Neto a transferir: $4.750".
5. Haz clic en **"Marcar pagado"**.
6. Recarga la página del Admin (Ctrl+Shift+R).
   - Verificar: "💰 Fondos de sostenimiento acumulados: $250".
7. Repite los pasos 2-3 con otro monto (ej: `2000`), luego en el Admin haz clic en **"Rechazar"**.
   - Verificar: el saldo del usuario en `/billetera` vuelve a subir por el monto completo ($2.000), y "Fondos de sostenimiento acumulados" sigue en $250 (no cambia).

- [ ] **Step 6: Final commit (if any leftover changes)**

```bash
git status
```

If there are no uncommitted changes, this task is done. Otherwise commit any remaining files with an appropriate message.

---

## Self-Review Notes

- **Spec coverage:** All sections of `2026-06-13-withdrawal-fee-design.md` are covered — schema changes (Task 3), `request_withdrawal`/`approve_withdrawal` (Task 3), backend action (Task 5), `WithdrawalForm` preview (Task 4), `AdminWithdrawal` type (Task 2), admin page summary + query (Task 7), admin row breakdown (Task 6), edge cases and testing plan (Task 8).
- **Placeholder scan:** none found.
- **Type consistency:** `fee_amount`/`net_amount` names match across the migration (Task 3), types (Task 2), admin query (Task 7), and row component (Task 6). `calculateWithdrawalFee`/`WITHDRAWAL_FEE_PERCENT` names match between Task 1 (definition) and Task 4 (usage).
