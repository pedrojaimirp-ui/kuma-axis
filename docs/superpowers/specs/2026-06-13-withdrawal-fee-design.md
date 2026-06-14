# Withdrawal Sustainability Fee (5%) — Design

**Goal:** Charge a 5% platform-sustainability fee on every withdrawal that gets approved, show the breakdown transparently to the user before they confirm, and let the owner see the accumulated total in the admin panel.

## Background

Currently `request_withdrawal(amount, destination)` deducts the full requested amount from `wallets.balance_available` and creates a `withdrawal_requests` row with `status = 'pending'`. The admin reviews it via `reviewWithdrawal(id, status)`:
- `'paid'` → directly updates `withdrawal_requests.status = 'paid'`
- `'rejected'` → calls `reject_withdrawal(id)`, which refunds the full amount to the user's balance

There is currently no concept of a platform fee.

## Data Model Changes (migration `0004_withdrawal_fee.sql`)

1. `public.platform_settings`: add column
   ```sql
   alter table public.platform_settings
     add column withdrawal_fees_accumulated numeric not null default 0;
   ```

2. `public.withdrawal_requests`: add columns to store the breakdown at request time
   ```sql
   alter table public.withdrawal_requests
     add column fee_amount numeric not null default 0,
     add column net_amount numeric not null default 0;
   ```

The fee percentage itself (5%) is **not** stored in a table — it's a constant, defined once in the database function and mirrored as a constant in the frontend for the preview message (see "Constants" below). This avoids RLS complications (regular users can't read `platform_settings`) and matches YAGNI — there's no admin UI to change it.

## Function Changes

### `request_withdrawal(p_amount numeric, p_destination text)` — modified

- Compute `v_fee := round(p_amount * 0.05)`
- Compute `v_net := p_amount - v_fee`
- Balance deduction unchanged: still deducts the full `p_amount` from `balance_available`
- Insert into `withdrawal_requests` now includes `fee_amount = v_fee, net_amount = v_net`
- `wallet_transactions` insert unchanged (still records `-p_amount` as `withdrawal_request`)

### `approve_withdrawal(p_id uuid)` — new function

Replaces the direct `.update({ status: 'paid' })` call for the "Marcar pagado" action.

```sql
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

`reject_withdrawal` is unchanged — rejecting still refunds the full `amount` and never touches `withdrawal_fees_accumulated`, since nothing was charged.

## Backend Action Changes

`lib/actions/admin.ts` — `reviewWithdrawal(id, status)`:
- `status === 'paid'` → call `supabase.rpc('approve_withdrawal', { p_id: id })` instead of `.from('withdrawal_requests').update(...)`
- `status === 'rejected'` → unchanged (`reject_withdrawal` RPC)

## Frontend Changes

### Constants

New file `lib/constants.ts` (or add to existing constants if one exists):
```ts
export const WITHDRAWAL_FEE_PERCENT = 5
```
Used only for the live preview message — the real deduction is computed server-side in `request_withdrawal`.

### `components/WithdrawalForm.tsx`

Below the "Monto a retirar" input, when `amount` is a positive number, show a live preview line:
```
Recibirás $9.500 — se retiene 5% ($500) para sostenimiento de la plataforma.
```
Computed as: `fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT / 100)`, `net = amount - fee`.

### `lib/types.ts` — `AdminWithdrawal`

Add `fee_amount: number` and `net_amount: number`.

### `app/admin/page.tsx`

- Withdrawal query (`.select(...)`) adds `fee_amount, net_amount`.
- Add a new query for `platform_settings.withdrawal_fees_accumulated` (admin-only RLS already allows this) and render it as a summary line above "Retiros pendientes":
  ```
  💰 Fondos de sostenimiento acumulados: $12.500
  ```

### `components/AdminWithdrawalRow.tsx`

Replace the single "Monto: $X" line with:
```
Monto solicitado: $10.000
Comisión plataforma (5%): $500
Neto a transferir: $9.500
```

## Edge Cases

- **Rounding:** `round(p_amount * 0.05)` — e.g. amount $5.000 → fee $250 (exact), amount $33 → fee $2 (rounds 1.65 → 2). Acceptable for this scale.
- **Rejected withdrawals:** `fee_amount`/`net_amount` are stored but irrelevant — `reject_withdrawal` refunds the full `amount`, and `approve_withdrawal` is never called, so `withdrawal_fees_accumulated` is untouched.
- **Existing pending withdrawal (PEDRO's $5.000 test request):** was created by the *old* `request_withdrawal`, so `fee_amount`/`net_amount` default to `0`. After migration, approving it via the new `approve_withdrawal` will add $0 to the accumulator and show "Comisión: $0 / Neto: $5.000" — acceptable for a leftover test record.

## Testing Plan

1. Apply migration (new columns + `approve_withdrawal` function).
2. Deploy updated code.
3. Manual E2E (same browser flow used so far):
   - Request a new withdrawal (e.g. $5.000) → confirm the preview shows "Recibirás $4.750 — se retiene 5% ($250)..."
   - In Admin, confirm the pending row shows "Monto solicitado: $5.000 / Comisión: $250 / Neto: $4.750"
   - Click "Marcar pagado" → confirm `withdrawal_fees_accumulated` summary shows `$250`
   - Request another withdrawal and click "Rechazar" → confirm full amount refunded and accumulator unchanged
