-- 0023_security_general_hardening.sql ----------------------------------------
-- Brecha 1: /reservar sin protección en middleware → corregido en middleware.ts
-- Brecha 2: texto sin límites máximos → corregido en actions (TypeScript)
-- Brecha 3: mensajes de error SQL expuestos → corregido en actions (TypeScript)
-- Brecha 4: reembolso de devolución puede ser negativo → corregido aquí
-- Brecha 5: IDs no validados como UUID → corregido en actions (TypeScript)
-- -----------------------------------------------------------------------------

-- BRECHA 4: approve_return — garantizar que el reembolso nunca sea negativo
-- Si por algún motivo shipping_cost >= price, el reembolso mínimo es $0.
-- También agrega la verificación de que la devolución no haya sido ya procesada.

create or replace function public.approve_return(p_return_id uuid)
returns void as $$
declare
  v_order_id  uuid;
  v_user_id   uuid;
  v_price     numeric;
  v_shipping  numeric;
  v_refund    numeric;
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  select order_id, user_id into v_order_id, v_user_id
    from public.return_requests
    where id = p_return_id and status = 'pending'
    for update;

  if v_order_id is null then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  select p.price, p.shipping_cost into v_price, v_shipping
    from public.orders o
    join public.packages p on p.id = o.package_id
    where o.id = v_order_id;

  -- Garantía: el reembolso nunca puede ser negativo
  v_refund := greatest(v_price - v_shipping, 0);

  update public.return_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_return_id;

  update public.orders set status = 'returned' where id = v_order_id;

  -- Solo acreditar si hay algo que reembolsar
  if v_refund > 0 then
    update public.wallets
      set balance_available = balance_available + v_refund, updated_at = now()
      where user_id = v_user_id;

    insert into public.wallet_transactions (user_id, amount, type, bucket, related_order_id, description)
    values (v_user_id, v_refund, 'return_refund', 'available', v_order_id,
            'Reembolso por devolución (envío no reembolsable)');
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.approve_return(uuid) to authenticated;

-- Protección adicional: nadie puede insertar directamente en return_requests
-- (ya bloqueado por RLS — no hay política INSERT). Esta verificación confirma
-- que solo request_return() puede hacerlo (SECURITY DEFINER).

-- Protección adicional: limitar el motivo de devolución a 500 caracteres
-- a nivel de base de datos también (defensa en profundidad)
alter table public.return_requests
  add constraint return_requests_reason_max_length
  check (char_length(reason) <= 500);

-- Protección adicional: limitar campos de dirección en orders
-- (ya validado en TypeScript, pero defensa en profundidad)
alter table public.orders
  add constraint orders_payment_reference_max_length
  check (payment_reference is null or char_length(payment_reference) <= 100);
