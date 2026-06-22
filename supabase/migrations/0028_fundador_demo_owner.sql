-- 0028_fundador_demo_owner.sql ------------------------------------------------
-- Permite previsualizar el certificado de Fundador en la cuenta del dueño
-- sin afectar los cupos reales (80/50/20) que se ofrecen a los clientes.
-- -----------------------------------------------------------------------------

-- 1. La función ya no cuenta a admin/owner dentro de los cupos ocupados,
--    para que cualquier badge de demostración nunca le quite un cupo real
--    a un cliente verdadero.
create or replace function public.handle_order_paid_founder()
returns trigger as $$
declare
  v_package_code text;
  v_cap          int;
  v_taken        int;
  v_prior_paid   int;
begin
  if new.status = 'paid' and old.status <> 'paid' then

    select count(*) into v_prior_paid
      from public.orders
      where user_id = new.user_id and status = 'paid' and id <> new.id;

    if v_prior_paid = 0 then
      select code, founder_cap into v_package_code, v_cap
        from public.packages where id = new.package_id;

      if v_cap > 0 then
        select count(*) into v_taken
          from public.founder_badges fb
          join public.profiles p on p.id = fb.user_id
          where fb.package_code = v_package_code
            and p.role not in ('admin', 'owner');

        if v_taken < v_cap then
          insert into public.founder_badges (user_id, package_code, founder_number)
          values (new.user_id, v_package_code, v_taken + 1)
          on conflict (user_id) do nothing;
        end if;
      end if;
    end if;

  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Badge de demostración para el dueño (edición Familiar, la más vistosa).
--    No descuenta cupos reales gracias al cambio anterior.
insert into public.founder_badges (user_id, package_code, founder_number)
select id, 'kuma3', 1
  from public.profiles
  where role = 'owner'
on conflict (user_id) do update
  set package_code = 'kuma3', founder_number = 1;
