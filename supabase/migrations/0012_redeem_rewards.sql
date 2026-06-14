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
