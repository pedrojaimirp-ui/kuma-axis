-- 0020_reward_catalog_v2.sql -----------------------------------------------
-- Actualiza redeem_loyalty_reward para soportar el catálogo ampliado.
-- Ahora tiene 10 premios en 4 niveles (Fácil / Medio / Premium / Exclusivo).
-- Los costos en puntos deben coincidir EXACTAMENTE con REWARD_CATALOG en
-- lib/constants.ts.

drop function if exists public.redeem_loyalty_reward(text);

create function public.redeem_loyalty_reward(p_reward_code text)
returns void as $$
declare
  v_user_id     uuid    := auth.uid();
  v_points_cost int;
  v_discount    numeric;
  v_spin_qty    int     := 0;
  v_updated     int;
begin
  -- Tabla de costos — debe coincidir con REWARD_CATALOG en lib/constants.ts
  case p_reward_code
    when 'extra_spin'      then v_points_cost := 50;
    when 'extra_spin_3'    then v_points_cost := 120;  v_spin_qty := 3;
    when 'discount_5000'   then v_points_cost := 500;
    when 'discount_10000'  then v_points_cost := 1000;
    when 'discount_30000'  then v_points_cost := 2500;
    when 'free_bag'        then v_points_cost := 1500;
    when 'free_2bags'      then v_points_cost := 3000;
    when 'kit_kuma'        then v_points_cost := 6000;
    when 'free_personal'   then v_points_cost := 8000;
    when 'cata_chocolate'  then v_points_cost := 12000;
    else raise exception 'Premio no válido: %', p_reward_code;
  end case;

  -- Descontar puntos (solo si hay suficientes)
  update public.wallets
    set loyalty_points_balance = loyalty_points_balance - v_points_cost,
        updated_at = now()
    where user_id = v_user_id
      and loyalty_points_balance >= v_points_cost;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'No tienes suficientes puntos de fidelización';
  end if;

  -- Entregar el premio según su tipo
  case p_reward_code
    when 'extra_spin' then
      -- 1 giro extra
      update public.spin_credits
        set referral_spins_balance = referral_spins_balance + 1,
            updated_at = now()
        where user_id = v_user_id;

    when 'extra_spin_3' then
      -- 3 giros extra
      update public.spin_credits
        set referral_spins_balance = referral_spins_balance + 3,
            updated_at = now()
        where user_id = v_user_id;

    else
      -- Todos los demás son cupones de descuento (voucher)
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

      insert into public.reward_vouchers (user_id, discount_amount, source_reward_code)
      values (v_user_id, v_discount, p_reward_code);
  end case;

  -- Registrar el canje en el historial
  insert into public.reward_redemptions (user_id, reward_code, points_spent)
  values (v_user_id, p_reward_code, v_points_cost);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.redeem_loyalty_reward(text) to authenticated;
