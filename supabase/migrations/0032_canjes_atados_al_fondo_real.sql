-- 0032_canjes_atados_al_fondo_real.sql ------------------------------------------
-- Brecha detectada por el dueño: el canje de premios (puntos -> cupones de
-- descuento) nunca estuvo conectado al fondo real acumulado por ventas
-- (platform_settings.roulette_fund_accumulated, el 6,11% de cada pedido
-- pagado). Una persona podía juntar puntos rápido en la ruleta y canjear
-- cupones de descuento sin límite, sin importar si la empresa realmente
-- tenía esa plata guardada — vaciando el fondo aunque no hubiera ventas
-- reales detrás.
--
-- Esta migración hace que CUALQUIER cupón con valor en dinero (descuentos,
-- bolsas gratis, kits, etc.) solo se pueda canjear si el fondo real tiene
-- esa plata disponible, y se la resta al momento de canjear. Los premios
-- que NO cuestan dinero (giros extra) siguen funcionando igual, sin tocar
-- el fondo.
--
-- Además se reestructuran los costos en puntos: ahora 1 punto = $1 peso
-- exacto para todos los cupones con valor en dinero (antes la proporción
-- era inconsistente, ~1 punto = $10, lo que hacía los premios demasiado
-- accesibles). Debe coincidir con REWARD_CATALOG en lib/constants.ts.
-- -----------------------------------------------------------------------------

create or replace function public.redeem_loyalty_reward(p_reward_code text)
returns void as $$
declare
  v_user_id        uuid    := auth.uid();
  v_points_cost    int;
  v_current_pts    int;
  v_discount       numeric;
  v_fund_available numeric;
begin
  -- Tabla de costos — debe coincidir con REWARD_CATALOG en lib/constants.ts
  case p_reward_code
    when 'extra_spin'      then v_points_cost := 50;
    when 'extra_spin_3'    then v_points_cost := 120;
    when 'discount_5000'   then v_points_cost := 5000;
    when 'discount_10000'  then v_points_cost := 10000;
    when 'discount_30000'  then v_points_cost := 30000;
    when 'free_bag'        then v_points_cost := 15000;
    when 'free_2bags'      then v_points_cost := 30000;
    when 'kit_kuma'        then v_points_cost := 60000;
    when 'free_personal'   then v_points_cost := 90000;
    when 'cata_chocolate'  then v_points_cost := 120000;
    else raise exception 'Premio no válido: %', p_reward_code;
  end case;

  -- Bloqueo explícito de la fila para evitar doble canje simultáneo
  select loyalty_points_balance into v_current_pts
    from public.wallets
    where user_id = v_user_id
    for update;

  if v_current_pts is null then
    raise exception 'Billetera no encontrada';
  end if;

  if v_current_pts < v_points_cost then
    raise exception 'No tienes suficientes puntos de fidelización';
  end if;

  -- Entregar el premio según su tipo
  case p_reward_code
    when 'extra_spin' then
      update public.wallets
        set loyalty_points_balance = loyalty_points_balance - v_points_cost,
            updated_at = now()
        where user_id = v_user_id;

      update public.spin_credits
        set referral_spins_balance = least(referral_spins_balance + 1, 200),
            updated_at = now()
        where user_id = v_user_id;

    when 'extra_spin_3' then
      update public.wallets
        set loyalty_points_balance = loyalty_points_balance - v_points_cost,
            updated_at = now()
        where user_id = v_user_id;

      update public.spin_credits
        set referral_spins_balance = least(referral_spins_balance + 3, 200),
            updated_at = now()
        where user_id = v_user_id;

    else
      -- Todos los demás son cupones con valor en dinero — deben estar
      -- respaldados por el fondo real acumulado por ventas.
      v_discount := case p_reward_code
        when 'discount_5000'  then 5000
        when 'discount_10000' then 10000
        when 'discount_30000' then 30000
        when 'free_bag'       then 15000
        when 'free_2bags'     then 30000
        when 'kit_kuma'       then 60000
        when 'free_personal'  then 90000
        when 'cata_chocolate' then 120000
      end;

      select roulette_fund_accumulated into v_fund_available
        from public.platform_settings
        where id = 1
        for update;

      if v_fund_available is null or v_fund_available < v_discount then
        raise exception 'Fondo de premios temporalmente agotado. Vuelve pronto — el fondo se renueva con cada nueva venta.';
      end if;

      update public.platform_settings
        set roulette_fund_accumulated = roulette_fund_accumulated - v_discount
        where id = 1;

      update public.wallets
        set loyalty_points_balance = loyalty_points_balance - v_points_cost,
            updated_at = now()
        where user_id = v_user_id;

      insert into public.reward_vouchers (user_id, discount_amount, source_reward_code)
      values (v_user_id, v_discount, p_reward_code);
  end case;

  -- Registrar el canje en el historial
  insert into public.reward_redemptions (user_id, reward_code, points_spent)
  values (v_user_id, p_reward_code, v_points_cost);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.redeem_loyalty_reward(text) to authenticated;
