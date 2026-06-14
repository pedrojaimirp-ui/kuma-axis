# RLS Hardening: Close Direct-Table-Write Gaps — Design

## Context

KÚMA AXIS uses Supabase Postgres with Row Level Security (RLS). All
money-moving and referral-sensitive operations are exposed to the app
through `security definer` RPC functions (`request_withdrawal`,
`purchase_with_balance`, `reject_withdrawal`, `approve_withdrawal`), which
bypass RLS and enforce their own validation (balance checks, role checks,
etc.).

However, three table-level RLS policies still allow authenticated users to
write directly to tables via PostgREST, bypassing those RPCs entirely. This
spec closes those three gaps. None of these changes affect the app's normal
behavior — the RPCs and existing insert flows continue to work unchanged.

## Gap 1: Fraudulent withdrawal requests (high impact)

**Current policy** (`0003_billetera_comisiones.sql`):

```sql
create policy "withdrawal_requests_insert_own" on public.withdrawal_requests
  for insert with check (user_id = auth.uid());
```

This allows any authenticated user to `INSERT` a row directly into
`withdrawal_requests` with `status = 'pending'` and an arbitrary `amount`,
`fee_amount`, and `net_amount` — without going through `request_withdrawal`,
which checks `balance_available` first.

A fabricated row would appear in `/admin` as a normal pending withdrawal. If
an admin approves it, they would manually transfer real money to a bank
account for a balance the user never had.

**Fix:** drop the `withdrawal_requests_insert_own` policy entirely. The
`request_withdrawal` function is `security definer`, so it does not need an
RLS policy to insert rows — it bypasses RLS. With no insert policy and RLS
enabled, PostgREST direct inserts are denied by default (deny-by-default).
Selects (own-or-admin) and admin updates remain unchanged.

## Gap 2: Redirecting referral commissions (medium impact)

**Current policy** (`0001_init.sql`):

```sql
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
```

This has no `with check`, and the only existing write-guard
(`prevent_role_self_escalation`) only blocks changes to `role`. A user can
`PATCH` their own `profiles` row and change `referred_by` to point at a
different upline after registration, redirecting all *future* commission
payouts for their own purchases away from their real referrer.

**Fix:** add a new trigger function `prevent_referral_change`, following the
same pattern as `prevent_role_self_escalation` (`0001_init.sql:46-58`):

```sql
create function public.prevent_referral_change()
returns trigger as $$
begin
  if new.referred_by is distinct from old.referred_by and auth.role() = 'authenticated' then
    raise exception 'Cannot change referred_by';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger profiles_prevent_referral_change
  before update on public.profiles
  for each row execute procedure public.prevent_referral_change();
```

Same exemption rationale as the role-escalation trigger: only blocks when
`auth.role() = 'authenticated'` (the app's normal user session), so
SQL-editor/service-role corrections by the project owner remain possible if
ever needed.

## Gap 3: Self-marking an order as "paid" (low impact)

**Current policy** (`0001_init.sql`):

```sql
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());
```

`createOrder` (`lib/actions/orders.ts:43-50`) always inserts with
`status: 'pending_payment'`, but the policy doesn't enforce that. A user
could `INSERT` an order directly with `status = 'paid'`. This does **not**
move money or trigger commissions (the `orders_paid_commissions` /
`orders_paid_unlock` triggers fire on `UPDATE`, not `INSERT`), but it would
make "Mis pedidos" show a fake paid order for that user.

**Fix:** tighten the `with check` clause:

```sql
drop policy "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid() and status = 'pending_payment');
```

## Migration file

All three fixes go in a single new migration:
`supabase/migrations/0005_rls_hardening.sql`.

## Testing plan

No application code changes, so no new Vitest tests. Verification is manual,
via the Supabase SQL Editor, after applying the migration:

1. Confirm `select * from public.withdrawal_requests` policies no longer
   include an insert policy for `authenticated` (gap 1).
2. As a non-admin test user, attempt to update `referred_by` on their own
   profile via the SQL editor using `set role authenticated; set
   request.jwt.claims...` — or, simpler, just confirm the trigger exists and
   re-run the existing E2E withdrawal/commission flows from the previous
   session to confirm nothing broke (gap 2).
3. Re-run the existing "Tienda" purchase flow end-to-end to confirm
   `createOrder` still inserts pending orders successfully (gap 3).

## Out of scope

- Rate limiting / brute-force protection on login (handled by Supabase Auth
  defaults).
- General "unhackable" security audit — explicitly descoped per user
  agreement in the prior session; this spec only addresses the three
  concrete RLS gaps identified above.
