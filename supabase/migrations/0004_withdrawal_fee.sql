-- Withdrawal sustainability fee (5%) -------------------------------------------

-- 1. Track accumulated platform fees
alter table public.platform_settings
  add column withdrawal_fees_accumulated numeric not null default 0;

-- 2. Store the fee/net breakdown on each withdrawal request
alter table public.withdrawal_requests
  add column fee_amount numeric not null default 0,
  add column net_amount numeric not null default 0;

-- 3. request_withdrawal now computes and stores the 5% fee breakdown
create or replace function public.request_withdrawal(p_amount numeric, p_destination text)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
  v_fee numeric;
  v_net numeric;
begin
  if p_amount <= 0 then
    raise exception 'Monto inválido';
  end if;

  select balance_available into v_balance
    from public.wallets where user_id = v_user_id for update;

  if v_balance < p_amount then
    raise exception 'Saldo insuficiente';
  end if;

  v_fee := round(p_amount * 0.05);
  v_net := p_amount - v_fee;

  update public.wallets
    set balance_available = balance_available - p_amount, updated_at = now()
    where user_id = v_user_id;

  insert into public.withdrawal_requests (user_id, amount, destination, fee_amount, net_amount)
  values (v_user_id, p_amount, p_destination, v_fee, v_net)
  returning id into v_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, related_withdrawal_id, description)
  values (v_user_id, -p_amount, 'withdrawal_request', 'available', v_id, 'Solicitud de retiro');

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_withdrawal(numeric, text) to authenticated;

-- 4. approve_withdrawal: marks a withdrawal as paid and accumulates its fee
create function public.approve_withdrawal(p_id uuid)
returns void as $$
declare
  v_fee numeric;
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  select fee_amount into v_fee
    from public.withdrawal_requests
    where id = p_id and status = 'pending'
    for update;

  if v_fee is null then
    raise exception 'Solicitud no encontrada o ya revisada';
  end if;

  update public.withdrawal_requests
    set status = 'paid', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;

  update public.platform_settings
    set withdrawal_fees_accumulated = withdrawal_fees_accumulated + v_fee
    where id = 1;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.approve_withdrawal(uuid) to authenticated;
