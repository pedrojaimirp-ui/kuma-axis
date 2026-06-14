# Ruleta Diaria — Design

## Context

`/ruleta` is currently a `<ComingSoon>` placeholder. The `packages` table
already has `daily_spins` (1/2/3 for KUMA 1/2/3) and `referral_spins` (1 for
all three) columns, unused until now. This spec implements a daily-spin
rewards wheel that pays $KCA prizes directly into the user's wallet
(`balance_available`), using the existing `credit_wallet` /
`wallet_transactions` infrastructure from `0003_billetera_comisiones.sql`.

A future "weekly special prize" (fondo semanal with 3-5 winners of
$10.000/$20.000/$50.000) is explicitly out of scope — separate spec/plan.

## Data model

### New table: `spin_credits`

One row per user, tracking how many spins they have available right now.

```sql
create table public.spin_credits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_spins_remaining int not null default 0,
  referral_spins_balance int not null default 0,
  last_daily_grant date,
  updated_at timestamptz not null default now()
);

alter table public.spin_credits enable row level security;

create policy "spin_credits_select_own_or_admin" on public.spin_credits
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );
```

No insert/update policies — both RPCs below are `security definer` and
bypass RLS. A row is created lazily (via `insert ... on conflict do nothing`)
the first time `claim_daily_spins` runs for a user.

- **`daily_spins_remaining`**: reset (overwritten, not added) to the user's
  current package's `daily_spins` once per calendar day, the first time they
  open `/ruleta` that day. Unused spins from previous days are lost.
- **`referral_spins_balance`**: incremented by `referral_spins` (from the
  *referred user's* package) every time one of the user's direct referrals
  gets an order marked `paid`. Never auto-reset; only decreases when spent.
- **`last_daily_grant`**: the date `daily_spins_remaining` was last set, used
  to detect "is today a new day".

"Current package" = the package of the user's most recent `paid` order. If
the user has no paid orders, `daily_spins_remaining` is set to 0.

### New table: `spin_history`

```sql
create table public.spin_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  prize_label text not null,
  prize_amount numeric not null,
  created_at timestamptz not null default now()
);

create index spin_history_user_idx on public.spin_history (user_id, created_at desc);

alter table public.spin_history enable row level security;

create policy "spin_history_select_own_or_admin" on public.spin_history
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );
```

`prize_label` is the human-readable prize (e.g. `"$200"` or
`"Vuelve y juega"`); `prize_amount` is the $KCA credited (0 for
"Vuelve y juega"). Only the `spin_roulette` RPC inserts rows here.

### `wallet_transactions` type addition

Add `'roulette_prize'` to the existing `type` check constraint
(`0003_billetera_comisiones.sql:30-34`):

```sql
alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'commission_l1', 'commission_l2', 'commission_l3', 'commission_l4',
    'owner_global', 'unlock', 'purchase_with_balance',
    'withdrawal_request', 'withdrawal_rejected', 'roulette_prize'
  ));
```

## Prize table

15 outcomes, weighted by probability (sums to 100):

| Label | Amount ($KCA) | Probability |
|---|---|---|
| Vuelve y juega | 0 | 25 |
| $50 | 50 | 15 |
| $100 | 100 | 12 |
| $150 | 150 | 10 |
| $200 | 200 | 8 |
| $250 | 250 | 7 |
| $300 | 300 | 6 |
| $350 | 350 | 5 |
| $400 | 400 | 4 |
| $450 | 450 | 3 |
| $500 | 500 | 2.5 |
| $1.000 | 1000 | 1.2 |
| $2.000 | 2000 | 0.7 |
| $3.000 | 3000 | 0.4 |
| $5.000 | 5000 | 0.2 |

Expected cost per spin ≈ $258 $KCA (factoring in that "Vuelve y juega" grants
another spin). With 1-3 daily spins, expected daily cost per active user is
roughly $258-$774.

## Functions

### `claim_daily_spins()` — security definer, called on page load

```sql
create function public.claim_daily_spins()
returns table (daily_spins_remaining int, referral_spins_balance int) as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_package_spins int;
begin
  insert into public.spin_credits (user_id) values (v_user_id)
  on conflict (user_id) do nothing;

  select coalesce((
    select p.daily_spins
    from public.orders o
    join public.packages p on p.id = o.package_id
    where o.user_id = v_user_id and o.status = 'paid'
    order by o.created_at desc
    limit 1
  ), 0) into v_package_spins;

  update public.spin_credits
    set daily_spins_remaining = v_package_spins,
        last_daily_grant = v_today,
        updated_at = now()
    where user_id = v_user_id
      and (last_daily_grant is null or last_daily_grant < v_today);

  return query
    select sc.daily_spins_remaining, sc.referral_spins_balance
    from public.spin_credits sc where sc.user_id = v_user_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.claim_daily_spins() to authenticated;
```

### `spin_roulette()` — security definer, performs one spin

```sql
create function public.spin_roulette()
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
    when v_roll < 25   then 'Vuelve y juega'
    when v_roll < 40   then '$50'
    when v_roll < 52   then '$100'
    when v_roll < 62   then '$150'
    when v_roll < 70   then '$200'
    when v_roll < 77   then '$250'
    when v_roll < 83   then '$300'
    when v_roll < 88   then '$350'
    when v_roll < 92   then '$400'
    when v_roll < 95   then '$450'
    when v_roll < 97.5 then '$500'
    when v_roll < 98.7 then '$1.000'
    when v_roll < 99.4 then '$2.000'
    when v_roll < 99.8 then '$3.000'
    else                    '$5.000'
  end;

  v_amount := case
    when v_roll < 25   then 0
    when v_roll < 40   then 50
    when v_roll < 52   then 100
    when v_roll < 62   then 150
    when v_roll < 70   then 200
    when v_roll < 77   then 250
    when v_roll < 83   then 300
    when v_roll < 88   then 350
    when v_roll < 92   then 400
    when v_roll < 95   then 450
    when v_roll < 97.5 then 500
    when v_roll < 98.7 then 1000
    when v_roll < 99.4 then 2000
    when v_roll < 99.8 then 3000
    else                    5000
  end;

  if v_amount > 0 then
    perform public.credit_wallet(v_user_id, v_amount, 'roulette_prize', null,
      'Premio de la ruleta: ' || v_label);
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
```

Note: `credit_wallet`'s 4th parameter is `p_related_order_id uuid` — passing
`null` is valid (existing signature, see `0003_billetera_comisiones.sql:125-131`).

### Referral spin trigger

New trigger function, fired alongside the existing commission triggers when
an order becomes `paid`:

```sql
create function public.handle_order_paid_referral_spin()
returns trigger as $$
declare
  v_referrer uuid;
  v_referral_spins int;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select referred_by into v_referrer from public.profiles where id = new.user_id;
    if v_referrer is not null then
      select referral_spins into v_referral_spins
        from public.packages where id = new.package_id;

      insert into public.spin_credits (user_id, referral_spins_balance)
      values (v_referrer, v_referral_spins)
      on conflict (user_id) do update
        set referral_spins_balance = spin_credits.referral_spins_balance + v_referral_spins,
            updated_at = now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger orders_paid_referral_spin
  after update on public.orders
  for each row execute procedure public.handle_order_paid_referral_spin();
```

This is a separate trigger (not merged into `handle_order_paid`) so it's
independently testable and doesn't disturb the existing, carefully-ordered
commission/unlock triggers.

## Frontend

### Files

- Create: `lib/constants.ts` — add `ROULETTE_PRIZES` array (15 entries:
  `{ label, amount, thresholdEnd }`), used by the frontend to render the grid
  and to know which cell to land on given a server response's `prize_label`.
- Create: `lib/actions/roulette.ts` — `claimDailySpins()` and `spinRoulette()`
  server actions wrapping the two RPCs.
- Create: `components/RouletteGrid.tsx` — renders the 15-cell prize grid,
  accepts a `landedIndex: number | null` prop to highlight the winning cell.
- Replace: `app/(dashboard)/ruleta/page.tsx` — server component that calls
  `claimDailySpins()` on load, passes `daily_spins_remaining +
  referral_spins_balance` and recent `spin_history` (last 5) to a new client
  component.
- Create: `components/RouletteClient.tsx` — client component: shows spins
  count, "¡Girar! 🎰" button, the `RouletteGrid`, the highlight-cycling
  animation, the result message, confetti trigger, and the "Tus últimos
  premios" list.

### Dependency

Add `canvas-confetti` (and `@types/canvas-confetti` as a dev dependency) via
npm.

### Chocolate theming

The whole feature is themed around cacao/chocolate (KÚMA ETERNA's brand),
not a generic casino:

- Page title: **"Ruleta de Cacao 🍫"** (not "Ruleta de Recompensas 🎰").
- Each grid cell shows **🍫 + amount** (e.g. `"🍫 $200"`), and the
  "Vuelve y juega" cell shows `"🍫 Otra vez"`.
- Spin button label: **"¡Girar la Ruleta de Cacao! 🍫"**.
- Win message (amount > 0): `"¡Endulzaste tu billetera! Ganaste $X 🍫🎉"`.
- "Vuelve y juega" message: `"🍫 Casi... ¡prueba otra vez!"` (no confetti).
- `confetti()` is called with `colors` set to the brand palette (kuma-dorado
  `#D4A017`-style gold and cacao-tostado brown — exact hex values pulled from
  `tailwind.config.ts` at implementation time) instead of default rainbow
  colors.

### Interaction flow

1. Page load: `claimDailySpins()` runs server-side, returns current spin
   counts. Page renders `RouletteGrid` (always visible, all 15 cells with
   their labels) + spins-available text + "¡Girar la Ruleta de Cacao! 🍫"
   button (disabled if 0 spins).
2. Click the button: it disables, client starts a `setInterval` that moves
   a highlighted-cell index forward every ~80ms (cycling through all 15
   cells), while calling `spinRoulette()` server action in parallel.
3. When `spinRoulette()` resolves with `{ prize_label, prize_amount }`: the
   client looks up the matching cell index in `ROULETTE_PRIZES`, lets the
   interval run for a minimum of ~1.5s total, then slows down and stops
   exactly on that cell (increase interval delay for the last few steps to
   simulate deceleration).
4. On stop: highlight the landed cell in gold. If `prize_amount > 0`, fire
   `confetti()` (brand colors) and show
   `"¡Endulzaste tu billetera! Ganaste $X 🍫🎉"`; if it's "Vuelve y juega",
   show `"🍫 Casi... ¡prueba otra vez!"` (no confetti) and increment the
   displayed spins-available count by 1.
5. Prepend the new result to "Tus últimos premios" (client-side state, no
   refetch needed).
6. Re-enable the spin button if spins remain.

### Wallet balance update

The Ruleta page doesn't show the wallet balance itself (that's `/billetera`'s
job), so no extra wallet query is needed here — `credit_wallet` already
updates `wallets.balance_available` server-side, and `/billetera` will show
the new total next time the user visits it.

## Testing plan

No new Vitest tests (all new logic is SQL `security definer` functions +
client-side animation, consistent with how `0003`/`0004`/`0005` migrations
were handled — manual SQL Editor verification + E2E in the browser).

Manual verification after migration + deploy:

1. As a user with a paid KUMA 2 order (2 daily spins), open `/ruleta`:
   confirm "Tienes 2 giros disponibles" and the 15-cell grid renders.
2. Click "Girar": confirm the highlight animation runs, lands on a cell,
   shows the correct prize message, and (if amount > 0) confetti fires.
3. Check `/billetera`: confirm `balance_available` increased by the prize
   amount and a new `wallet_transactions` row with
   `type = 'roulette_prize'` exists.
4. Spin until 0 spins remain: confirm the "Girar" button becomes disabled
   and/or `spin_roulette()` raises "No tienes giros disponibles".
5. Referral spin: as a referred user, get an order approved (`paid`) by
   admin; confirm the referrer's `spin_credits.referral_spins_balance`
   increases by `referral_spins` (1) for that package.
6. Reload `/ruleta` the next day (or manually update `last_daily_grant` to
   yesterday in SQL Editor for testing): confirm
   `daily_spins_remaining` resets to the package's `daily_spins` value.

## Out of scope

- Weekly special prize (fondo semanal, 3-5 winners) — separate future spec.
- Showing wallet balance directly on `/ruleta`.
- Admin-side visibility into spin history (RLS already allows admin SELECT
  on `spin_credits`/`spin_history` if needed later, but no UI is built for
  it in this spec).
