# RLS Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three RLS gaps that let authenticated users write directly to `withdrawal_requests`, `profiles`, and `orders` bypassing the app's security-definer RPCs and insert flows.

**Architecture:** Single new SQL migration file (`0005_rls_hardening.sql`) containing three independent changes: drop an unused insert policy, add a new BEFORE UPDATE trigger, and tighten an existing insert policy's `with check`. No application code changes.

**Tech Stack:** Supabase Postgres (SQL migrations), applied manually via the Supabase SQL Editor (same process as `0004_withdrawal_fee.sql`).

---

## File Structure

- Create: `supabase/migrations/0005_rls_hardening.sql` — all three fixes, in the order they appear in the spec (gap 1, gap 2, gap 3).

No other files change. There is no test suite for SQL migrations in this repo (verification is manual via Supabase SQL Editor + existing E2E flows), so there are no Vitest steps in this plan.

---

### Task 1: Write the RLS hardening migration

**Files:**
- Create: `supabase/migrations/0005_rls_hardening.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- RLS hardening: close direct-table-write gaps ----------------------------

-- Gap 1: withdrawal_requests allowed direct INSERT with arbitrary amount/
-- fee_amount/net_amount/status, bypassing request_withdrawal's balance
-- check. request_withdrawal is security definer and does not need this
-- policy — drop it. With no insert policy and RLS enabled, direct inserts
-- by authenticated users are denied by default.
drop policy "withdrawal_requests_insert_own" on public.withdrawal_requests;

-- Gap 2: profiles_update_own has no with check, so a user could PATCH
-- their own referred_by to redirect future commissions to a different
-- upline. Block changes to referred_by the same way role-escalation is
-- already blocked.
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

-- Gap 3: orders_insert_own allowed inserting an order directly with
-- status = 'paid'. createOrder always inserts 'pending_payment' — enforce
-- that at the policy level too.
drop policy "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid() and status = 'pending_payment');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0005_rls_hardening.sql
git commit -m "feat: harden RLS policies against direct-table-write bypasses"
```

---

### Task 2: Apply the migration in Supabase and verify

This step is run by the non-technical project owner in the Supabase Dashboard (same process as `0004_withdrawal_fee.sql`).

**Files:** none (no code changes — this is a manual database step)

- [ ] **Step 1: Run the migration SQL**

Provide these exact instructions to the user:

1. Open [supabase.com](https://supabase.com), log in, open the KÚMA AXIS project.
2. In the left menu, click **"SQL Editor"**.
3. Click **"New query"**.
4. Paste the full contents of `supabase/migrations/0005_rls_hardening.sql` (the SQL block from Task 1, Step 1).
5. Press `Ctrl + Enter` (or click **Run**).
6. Expect: **"Success. No rows returned."**

- [ ] **Step 2: Verify gap 1 is closed**

Paste and run:

```sql
select policyname, cmd from pg_policies
where tablename = 'withdrawal_requests';
```

Expected result: no row with `cmd = 'INSERT'` (only `SELECT` and `UPDATE` policies remain — `withdrawal_requests_select_own_or_admin` and `withdrawal_requests_update_admin`).

- [ ] **Step 3: Verify gap 2 is in place**

Paste and run:

```sql
select tgname from pg_trigger
where tgrelid = 'public.profiles'::regclass and not tgisinternal;
```

Expected result: includes both `profiles_prevent_role_escalation` and `profiles_prevent_referral_change`.

- [ ] **Step 4: Verify gap 3 is in place**

Paste and run:

```sql
select policyname, cmd, with_check from pg_policies
where tablename = 'orders' and policyname = 'orders_insert_own';
```

Expected result: `with_check` column shows
`((user_id = auth.uid()) AND (status = 'pending_payment'::text))`.

- [ ] **Step 5: Re-run existing E2E flows to confirm nothing broke**

Guide the user (in Spanish, from-scratch instructions) through:

1. **Compra normal:** registrar un pedido nuevo desde `/tienda/comprar/[code]` (igual que en sesiones anteriores) — debe seguir funcionando y aparecer en "Mis pedidos" como pendiente.
2. **Retiro normal:** desde `/billetera`, solicitar un retiro pequeño — debe seguir mostrando la vista previa de la comisión del 5% y registrarse correctamente.
3. **Admin:** en `/admin`, confirmar que el retiro recién creado aparece en "Retiros pendientes" con el desglose de comisión, y que "Marcar pagado" / "Rechazar" siguen funcionando.

If all three pass, the hardening migration is verified complete with no regressions.

---

## Self-Review

**Spec coverage:**
- Gap 1 (fraudulent withdrawal inserts) → Task 1 Step 1 (drop policy), Task 2 Step 2 (verify).
- Gap 2 (referral redirection) → Task 1 Step 1 (trigger), Task 2 Step 3 (verify).
- Gap 3 (fake paid orders) → Task 1 Step 1 (tightened policy), Task 2 Step 4 (verify).
- Spec's testing plan (manual verification + re-run E2E flows) → Task 2 Steps 2-5.
- Spec's "out of scope" items are correctly excluded — no tasks added for them.

**Placeholder scan:** none found — all SQL is complete and copy-pasteable, all verification queries have exact expected results.

**Type consistency:** N/A (no application types involved — SQL-only change).
