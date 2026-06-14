-- Limite de referidos directos por paquete -------------------------------
-- Cada paquete define cuantos referidos directos puede registrar un
-- usuario con su codigo. Las cuentas admin/owner no tienen limite.

alter table public.packages add column max_direct_referrals int;

update public.packages set max_direct_referrals = 5 where code = 'kuma1';
update public.packages set max_direct_referrals = 8 where code = 'kuma2';
update public.packages set max_direct_referrals = 10 where code = 'kuma3';

-- resolve_referral_code: ahora valida el limite de referidos directos del
-- paquete activo del referente (su pedido pagado mas reciente). Si ya
-- alcanzo el limite, retorna null (el registro continua sin quedar
-- enlazado a ese referente). Cuentas admin/owner u sin paquete pagado no
-- tienen limite.
create or replace function public.resolve_referral_code(code text)
returns uuid as $$
declare
  v_referrer_id uuid;
  v_referrer_role text;
  v_max int;
  v_current_count int;
begin
  select id, role into v_referrer_id, v_referrer_role
  from public.profiles where referral_code = code;

  if v_referrer_id is null then
    return null;
  end if;

  if v_referrer_role in ('admin', 'owner') then
    return v_referrer_id;
  end if;

  select p.max_direct_referrals into v_max
  from public.orders o
  join public.packages p on p.id = o.package_id
  where o.user_id = v_referrer_id and o.status = 'paid'
  order by o.created_at desc
  limit 1;

  if v_max is null then
    return v_referrer_id;
  end if;

  select count(*) into v_current_count
  from public.profiles where referred_by = v_referrer_id;

  if v_current_count >= v_max then
    return null;
  end if;

  return v_referrer_id;
end;
$$ language plpgsql security definer stable set search_path = public;
