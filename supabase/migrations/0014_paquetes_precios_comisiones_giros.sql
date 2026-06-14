-- 0014_paquetes_precios_comisiones_giros.sql --------------------------------
-- Renombra los paquetes (Personal/Pareja/Familiar), ajusta precios y la
-- tabla de comisiones por nivel, y cambia el otorgamiento de giros por
-- referido: ahora se otorga 1 giro a L1 y a L2 solo cuando el referido
-- activa su primer pedido pagado (no en compras repetidas de la misma
-- persona).

update public.packages set
  name = 'Paquete Personal',
  price = 90000,
  commissions_json = '{"L1": 6500, "L2": 3000, "L3": 2000, "L4": 1000}'
where code = 'kuma1';

update public.packages set
  name = 'Paquete Pareja',
  price = 180000,
  commissions_json = '{"L1": 12600, "L2": 5000, "L3": 3000, "L4": 1400}'
where code = 'kuma2';

update public.packages set
  name = 'Paquete Familiar',
  price = 270000,
  commissions_json = '{"L1": 18000, "L2": 7000, "L3": 2300, "L4": 1600}'
where code = 'kuma3';

-- handle_order_paid_referral_spin: ahora solo otorga giros en la primera
-- compra pagada de cada usuario (su "activacion"), y se otorgan tanto al
-- referido directo (L1) como al referido de ese referido (L2).
create or replace function public.handle_order_paid_referral_spin()
returns trigger as $$
declare
  v_l1 uuid;
  v_l2 uuid;
  v_referral_spins int;
  v_prior_paid int;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select count(*) into v_prior_paid
      from public.orders
      where user_id = new.user_id and status = 'paid' and id <> new.id;

    if v_prior_paid = 0 then
      select referral_spins into v_referral_spins
        from public.packages where id = new.package_id;

      select referred_by into v_l1 from public.profiles where id = new.user_id;

      if v_l1 is not null then
        insert into public.spin_credits (user_id, referral_spins_balance)
        values (v_l1, v_referral_spins)
        on conflict (user_id) do update
          set referral_spins_balance = spin_credits.referral_spins_balance + v_referral_spins,
              updated_at = now();

        select referred_by into v_l2 from public.profiles where id = v_l1;

        if v_l2 is not null then
          insert into public.spin_credits (user_id, referral_spins_balance)
          values (v_l2, v_referral_spins)
          on conflict (user_id) do update
            set referral_spins_balance = spin_credits.referral_spins_balance + v_referral_spins,
                updated_at = now();
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
