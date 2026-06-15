-- 0015_devoluciones.sql --------------------------------------------------------
-- Derecho de retracto / devoluciones (Ley 1480 de 2011): el cliente puede
-- solicitar la devolución de un pedido entregado dentro de los 5 días
-- hábiles siguientes a la entrega. El admin marca la entrega y revisa la
-- solicitud; si la aprueba, se acredita al saldo disponible el precio del
-- paquete menos el costo de envío (no reembolsable).

-- packages: costo de envío (no reembolsable) ------------------------------------
alter table public.packages add column shipping_cost numeric not null default 0;

update public.packages set shipping_cost = 10000 where code = 'kuma1';
update public.packages set shipping_cost = 15000 where code = 'kuma2';
update public.packages set shipping_cost = 20000 where code = 'kuma3';

-- orders: nuevos estados 'delivered'/'returned' + fecha de entrega --------------
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending_payment', 'paid', 'rejected', 'delivered', 'returned'));

alter table public.orders add column delivered_at timestamptz;

-- return_requests: solicitudes de devolución -------------------------------------
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  user_id uuid not null references public.profiles (id),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.return_requests enable row level security;

create policy "return_requests_select_own_or_admin" on public.return_requests
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

-- wallet_transactions: nuevo tipo 'return_refund' ----------------------------------
alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'commission_l1', 'commission_l2', 'commission_l3', 'commission_l4',
    'owner_global', 'unlock', 'purchase_with_balance',
    'withdrawal_request', 'withdrawal_rejected', 'roulette_prize',
    'return_refund'
  ));

-- business_days_between: cuenta los días hábiles (lunes a viernes) entre dos
-- fechas, sin contar festivos colombianos (fuera de alcance).
create function public.business_days_between(p_from timestamptz, p_to timestamptz)
returns int as $$
declare
  v_day date := (p_from at time zone 'utc')::date;
  v_end date := (p_to at time zone 'utc')::date;
  v_count int := 0;
begin
  while v_day < v_end loop
    v_day := v_day + 1;
    if extract(isodow from v_day) < 6 then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$ language plpgsql set search_path = public;

grant execute on function public.business_days_between(timestamptz, timestamptz) to authenticated;

-- mark_order_delivered: solo admin/owner, pedido debe estar 'paid' ----------------
create function public.mark_order_delivered(p_order_id uuid)
returns void as $$
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  update public.orders
    set status = 'delivered', delivered_at = now()
    where id = p_order_id and status = 'paid';

  if not found then
    raise exception 'Pedido no encontrado o no está en estado pagado';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.mark_order_delivered(uuid) to authenticated;

-- request_return: el cliente solicita devolución de un pedido entregado ----------
create function public.request_return(p_order_id uuid, p_reason text)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_delivered_at timestamptz;
  v_existing int;
  v_id uuid;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Debes indicar un motivo para la devolución';
  end if;

  select status, delivered_at into v_status, v_delivered_at
    from public.orders
    where id = p_order_id and user_id = v_user_id;

  if v_status is null then
    raise exception 'Pedido no encontrado';
  end if;

  if v_status <> 'delivered' then
    raise exception 'Solo se puede solicitar devolución de pedidos entregados';
  end if;

  select count(*) into v_existing
    from public.return_requests
    where order_id = p_order_id and status in ('pending', 'approved');

  if v_existing > 0 then
    raise exception 'Ya existe una solicitud de devolución para este pedido';
  end if;

  if public.business_days_between(v_delivered_at, now()) > 5 then
    raise exception 'Ya pasaron los 5 días hábiles para solicitar la devolución de este pedido';
  end if;

  insert into public.return_requests (order_id, user_id, reason)
  values (p_order_id, v_user_id, p_reason)
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_return(uuid, text) to authenticated;

-- approve_return: admin aprueba, acredita precio - envío al saldo disponible ------
create function public.approve_return(p_return_id uuid)
returns void as $$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_price numeric;
  v_shipping numeric;
  v_refund numeric;
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

  v_refund := v_price - v_shipping;

  update public.return_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_return_id;

  update public.orders set status = 'returned' where id = v_order_id;

  update public.wallets
    set balance_available = balance_available + v_refund, updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, related_order_id, description)
  values (v_user_id, v_refund, 'return_refund', 'available', v_order_id, 'Reembolso por devolución de pedido (envío no reembolsable)');
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.approve_return(uuid) to authenticated;

-- reject_return: admin rechaza, no mueve dinero ni cambia el pedido ---------------
create function public.reject_return(p_return_id uuid)
returns void as $$
declare
  v_id uuid;
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  select id into v_id
    from public.return_requests
    where id = p_return_id and status = 'pending'
    for update;

  if v_id is null then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  update public.return_requests
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_return_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.reject_return(uuid) to authenticated;
