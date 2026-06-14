-- Nuevos premios grandes de la ruleta: $10.000, $20.000, $50.000, $100.000.
-- Por ahora $20.000, $50.000 y $100.000 solo son visibles en la rueda (0%
-- de probabilidad) -- se liberaran una vez por semana segun el recaudo del
-- fondo de juegos. $10.000 si puede salir, pero con una probabilidad minima
-- (0.02%), tomada del extremo superior del rango de $5.000.
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
