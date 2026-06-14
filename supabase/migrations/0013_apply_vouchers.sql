-- 0013_apply_vouchers.sql --------------------------------------------------
-- Permite marcar un cupón (reward_vouchers) como usado al confirmar una
-- compra, y agrega soporte de cupones a purchase_with_balance.

-- apply_voucher_to_order: usado por el flujo de "transferencia" (createOrder).
-- Marca el cupón como usado y lo asocia al pedido. Devuelve el descuento
-- (solo informativo: en el flujo de transferencia el pago lo verifica un
-- administrador manualmente).
create function public.apply_voucher_to_order(p_voucher_id uuid, p_order_id uuid)
returns numeric as $$
declare
  v_user_id uuid := auth.uid();
  v_discount numeric;
begin
  update public.reward_vouchers
    set status = 'used', used_order_id = p_order_id, used_at = now()
    where id = p_voucher_id and user_id = v_user_id and status = 'available'
  returning discount_amount into v_discount;

  if v_discount is null then
    raise exception 'Cupón no disponible';
  end if;

  return v_discount;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.apply_voucher_to_order(uuid, uuid) to authenticated;

-- purchase_with_balance: agrega un 4to parámetro opcional p_voucher_id.
-- Se elimina la versión anterior (3 parámetros) para evitar ambigüedad de
-- sobrecarga entre funciones con el mismo nombre.
drop function if exists public.purchase_with_balance(text, jsonb, boolean);

create function public.purchase_with_balance(
  p_package_code text,
  p_shipping_address jsonb,
  p_auto_renew boolean,
  p_voucher_id uuid default null
)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_package_id uuid;
  v_price numeric;
  v_balance numeric;
  v_order_id uuid;
  v_discount numeric := 0;
begin
  select id, price into v_package_id, v_price
    from public.packages where code = p_package_code;

  if v_package_id is null then
    raise exception 'Paquete no encontrado';
  end if;

  if p_voucher_id is not null then
    update public.reward_vouchers
      set status = 'used', used_at = now()
      where id = p_voucher_id and user_id = v_user_id and status = 'available'
    returning discount_amount into v_discount;

    if v_discount is null then
      raise exception 'Cupón no disponible';
    end if;

    v_price := greatest(v_price - v_discount, 0);
  end if;

  select balance_available into v_balance
    from public.wallets where user_id = v_user_id for update;

  if v_balance < v_price then
    raise exception 'Saldo insuficiente';
  end if;

  update public.wallets
    set balance_available = balance_available - v_price, updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, description)
  values (v_user_id, -v_price, 'purchase_with_balance', 'available',
          'Compra de paquete con saldo $KCA');

  insert into public.orders (user_id, package_id, shipping_address, auto_renew, status)
  values (v_user_id, v_package_id, p_shipping_address, p_auto_renew, 'pending_payment')
  returning id into v_order_id;

  update public.orders set status = 'paid' where id = v_order_id;

  if p_voucher_id is not null then
    update public.reward_vouchers set used_order_id = v_order_id where id = p_voucher_id;
  end if;

  return v_order_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.purchase_with_balance(text, jsonb, boolean, uuid) to authenticated;
