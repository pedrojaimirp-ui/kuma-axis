-- Ruleta de Cacao: daily/referral spin tracking + prize RPCs -------------

-- spin_credits: how many spins each user has available right now
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

-- spin_history: record of every spin and its prize
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

-- allow 'roulette_prize' as a wallet_transactions type
alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'commission_l1', 'commission_l2', 'commission_l3', 'commission_l4',
    'owner_global', 'unlock', 'purchase_with_balance',
    'withdrawal_request', 'withdrawal_rejected', 'roulette_prize'
  ));

-- claim_daily_spins: grants today's daily spins (once per day) and returns
-- the user's current spin balances
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

-- spin_roulette: spends one spin and returns the prize won
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

-- referral spin: when a referred user's order becomes 'paid', credit the
-- referrer with that package's referral_spins
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
