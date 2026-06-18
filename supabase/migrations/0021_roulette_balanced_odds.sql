-- 0021_roulette_balanced_odds.sql ------------------------------------------
-- Reequilibra las probabilidades de la Ruleta KÚMA para proteger el fondo.
-- Promedio anterior: ~177 puntos/giro.
-- Promedio nuevo:    ~111 puntos/giro  (37% menos de pago por giro).
-- Cambios clave:
--   • "Vuelve y juega" sube de 25% → 30%
--   • Premios medianos (300-500 pts) reducidos significativamente
--   • Premios grandes (1.000-5.000 pts) ahora son muy raros
--   • Premio de 10.000 pts eliminado (era un error — nunca estuvo en la pantalla)
--   • Máximo ahora es 5.000 pts (probabilidad: 1 en 10.000 giros)

create or replace function public.spin_roulette()
returns table (prize_label text, prize_amount numeric) as $$
declare
  v_user_id uuid    := auth.uid();
  v_daily   int;
  v_referral int;
  v_roll    numeric := random() * 100;
  v_label   text;
  v_amount  numeric;
begin
  select daily_spins_remaining, referral_spins_balance
    into v_daily, v_referral
    from public.spin_credits where user_id = v_user_id for update;

  if v_daily is null or (v_daily + v_referral) <= 0 then
    raise exception 'No tienes giros disponibles';
  end if;

  if v_daily > 0 then
    update public.spin_credits
      set daily_spins_remaining = daily_spins_remaining - 1, updated_at = now()
      where user_id = v_user_id;
  else
    update public.spin_credits
      set referral_spins_balance = referral_spins_balance - 1, updated_at = now()
      where user_id = v_user_id;
  end if;

  -- ---------------------------------------------------------------
  -- Tabla de probabilidades (acumuladas)
  --  < 30.00  → 0     pts  — 30.00%  Vuelve y juega
  --  < 50.00  → 50    pts  — 20.00%
  --  < 65.00  → 100   pts  — 15.00%
  --  < 77.00  → 150   pts  — 12.00%
  --  < 85.00  → 200   pts  —  8.00%
  --  < 91.00  → 250   pts  —  6.00%
  --  < 95.00  → 300   pts  —  4.00%
  --  < 98.00  → 350   pts  —  3.00%
  --  < 99.00  → 400   pts  —  1.00%
  --  < 99.50  → 500   pts  —  0.50%
  --  < 99.80  → 1.000 pts  —  0.30%
  --  < 99.95  → 2.000 pts  —  0.15%
  --  < 99.99  → 3.000 pts  —  0.04%
  --  else     → 5.000 pts  —  0.01%  (1 en 10.000 giros)
  -- ---------------------------------------------------------------

  v_label := case
    when v_roll < 30.00 then 'Vuelve y juega'
    when v_roll < 50.00 then '$50'
    when v_roll < 65.00 then '$100'
    when v_roll < 77.00 then '$150'
    when v_roll < 85.00 then '$200'
    when v_roll < 91.00 then '$250'
    when v_roll < 95.00 then '$300'
    when v_roll < 98.00 then '$350'
    when v_roll < 99.00 then '$400'
    when v_roll < 99.50 then '$500'
    when v_roll < 99.80 then '$1.000'
    when v_roll < 99.95 then '$2.000'
    when v_roll < 99.99 then '$3.000'
    else                     '$5.000'
  end;

  v_amount := case
    when v_roll < 30.00 then 0
    when v_roll < 50.00 then 50
    when v_roll < 65.00 then 100
    when v_roll < 77.00 then 150
    when v_roll < 85.00 then 200
    when v_roll < 91.00 then 250
    when v_roll < 95.00 then 300
    when v_roll < 98.00 then 350
    when v_roll < 99.00 then 400
    when v_roll < 99.50 then 500
    when v_roll < 99.80 then 1000
    when v_roll < 99.95 then 2000
    when v_roll < 99.99 then 3000
    else                     5000
  end;

  if v_amount > 0 then
    update public.wallets
      set loyalty_points_balance = loyalty_points_balance + v_amount,
          updated_at = now()
      where user_id = v_user_id;
  else
    -- "Vuelve y juega" devuelve 1 giro extra
    update public.spin_credits
      set referral_spins_balance = referral_spins_balance + 1,
          updated_at = now()
      where user_id = v_user_id;
  end if;

  insert into public.spin_history (user_id, prize_label, prize_amount)
  values (v_user_id, v_label, v_amount);

  return query select v_label, v_amount;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.spin_roulette() to authenticated;
