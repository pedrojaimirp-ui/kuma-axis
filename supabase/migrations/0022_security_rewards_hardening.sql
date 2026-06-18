-- 0022_security_rewards_hardening.sql -------------------------------------
-- Cierra 6 brechas de seguridad en el sistema de puntos y premios.
--
-- Brecha 1: loyalty_points_balance sin piso de 0  → CHECK >= 0
-- Brecha 2: spin_credits sin piso de 0            → CHECK >= 0
-- Brecha 3: apply_voucher_to_order no verifica
--           que el pedido pertenece al usuario     → añade WHERE + orders check
-- Brecha 4: referral_spins_balance sin límite max  → cap en 200 giros
-- Brecha 5: redeem_loyalty_reward sin FOR UPDATE   → añade lock explícito
-- Brecha 6: reward_vouchers.discount_amount sin min → CHECK > 0
-- -------------------------------------------------------------------------

-- =========================================================================
-- BRECHA 1 y 2: Restricciones de piso en base de datos
-- =========================================================================

alter table public.wallets
  add constraint wallets_loyalty_points_non_negative
  check (loyalty_points_balance >= 0);

alter table public.spin_credits
  add constraint spin_credits_daily_non_negative
  check (daily_spins_remaining >= 0);

alter table public.spin_credits
  add constraint spin_credits_referral_non_negative
  check (referral_spins_balance >= 0);

-- =========================================================================
-- BRECHA 6: Validación mínima en cupones
-- =========================================================================

alter table public.reward_vouchers
  add constraint reward_vouchers_discount_positive
  check (discount_amount > 0);

-- =========================================================================
-- BRECHA 4: Límite máximo de giros acumulados (cap = 200)
-- Protege contra bugs o abuso en el trigger de giros por referido.
-- =========================================================================

create or replace function public.handle_order_paid_referral_spin()
returns trigger as $$
declare
  v_referrer     uuid;
  v_referral_spins int;
  v_cap          int := 200;  -- máximo giros acumulados por seguridad
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select referred_by into v_referrer from public.profiles where id = new.user_id;
    if v_referrer is not null then
      select referral_spins into v_referral_spins
        from public.packages where id = new.package_id;

      insert into public.spin_credits (user_id, referral_spins_balance)
      values (v_referrer, v_referral_spins)
      on conflict (user_id) do update
        set referral_spins_balance = least(
              spin_credits.referral_spins_balance + v_referral_spins,
              v_cap
            ),
            updated_at = now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- =========================================================================
-- BRECHA 3: apply_voucher_to_order — verificar que el pedido es del usuario
-- =========================================================================

drop function if exists public.apply_voucher_to_order(uuid, uuid);

create function public.apply_voucher_to_order(p_voucher_id uuid, p_order_id uuid)
returns numeric as $$
declare
  v_user_id uuid := auth.uid();
  v_discount numeric;
  v_order_owner uuid;
begin
  -- Verificar que el pedido pertenece al usuario que llama
  select user_id into v_order_owner
    from public.orders
    where id = p_order_id;

  if v_order_owner is distinct from v_user_id then
    raise exception 'El pedido no te pertenece';
  end if;

  -- Marcar el cupón como usado (atómico: solo si está disponible y es del usuario)
  update public.reward_vouchers
    set status = 'used', used_order_id = p_order_id, used_at = now()
    where id = p_voucher_id
      and user_id = v_user_id
      and status = 'available'
  returning discount_amount into v_discount;

  if v_discount is null then
    raise exception 'Cupón no disponible';
  end if;

  return v_discount;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.apply_voucher_to_order(uuid, uuid) to authenticated;

-- =========================================================================
-- BRECHA 5: redeem_loyalty_reward — añade FOR UPDATE explícito antes de
-- descontar puntos para evitar race conditions en llamadas simultáneas.
-- =========================================================================

drop function if exists public.redeem_loyalty_reward(text);

create function public.redeem_loyalty_reward(p_reward_code text)
returns void as $$
declare
  v_user_id      uuid    := auth.uid();
  v_points_cost  int;
  v_current_pts  int;
  v_discount     numeric;
  v_updated      int;
begin
  -- Tabla de costos — debe coincidir con REWARD_CATALOG en lib/constants.ts
  case p_reward_code
    when 'extra_spin'      then v_points_cost := 50;
    when 'extra_spin_3'    then v_points_cost := 120;
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

  -- Descontar puntos (el CHECK de base de datos garantiza que no baje de 0)
  update public.wallets
    set loyalty_points_balance = loyalty_points_balance - v_points_cost,
        updated_at = now()
    where user_id = v_user_id;

  -- Entregar el premio según su tipo
  case p_reward_code
    when 'extra_spin' then
      update public.spin_credits
        set referral_spins_balance = least(referral_spins_balance + 1, 200),
            updated_at = now()
        where user_id = v_user_id;

    when 'extra_spin_3' then
      update public.spin_credits
        set referral_spins_balance = least(referral_spins_balance + 3, 200),
            updated_at = now()
        where user_id = v_user_id;

    else
      -- Todos los demás son cupones de descuento
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
