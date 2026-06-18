-- 0024_fondo_ruleta.sql -------------------------------------------------------
-- Establece el fondo de la ruleta KÚMA:
-- • Agrega roulette_fund_percent (6.11%) y roulette_fund_accumulated a
--   platform_settings.
-- • Actualiza handle_order_paid() para acumular automáticamente el porcentaje
--   en roulette_fund_accumulated cada vez que un pedido pasa a 'paid'.
-- -----------------------------------------------------------------------------

-- 1. Nuevas columnas en platform_settings
alter table public.platform_settings
  add column if not exists roulette_fund_percent  numeric not null default 6.11,
  add column if not exists roulette_fund_accumulated numeric not null default 0;

-- Inicializar el porcentaje establecido
update public.platform_settings set roulette_fund_percent = 6.11 where id = 1;

-- 2. Reemplazar handle_order_paid() para incluir el aporte al fondo de ruleta
create or replace function public.handle_order_paid()
returns trigger as $$
declare
  v_commissions    jsonb;
  v_price          numeric;
  v_owner_percent  numeric;
  v_ruleta_percent numeric;
  v_owner_id       uuid;
  v_current        uuid;
  v_level          int;
  v_amount         numeric;
  v_ruleta_aporte  numeric;
begin
  if new.status = 'paid' and old.status <> 'paid' then

    select commissions_json, price into v_commissions, v_price
      from public.packages where id = new.package_id;

    select owner_commission_percent, roulette_fund_percent
      into v_owner_percent, v_ruleta_percent
      from public.platform_settings where id = 1;

    -- Comisión global del dueño
    select id into v_owner_id from public.profiles where role = 'owner' limit 1;
    if v_owner_id is not null then
      perform public.credit_wallet(
        v_owner_id,
        round(v_price * v_owner_percent / 100, 2),
        'owner_global', new.id,
        'Comisión global ' || v_owner_percent || '% sobre pedido'
      );
    end if;

    -- Aporte automático al fondo de la ruleta KÚMA
    v_ruleta_aporte := round(v_price * v_ruleta_percent / 100, 2);
    if v_ruleta_aporte > 0 then
      update public.platform_settings
        set roulette_fund_accumulated = roulette_fund_accumulated + v_ruleta_aporte
        where id = 1;
    end if;

    -- Comisiones por red de referidos (niveles 1-4)
    v_current := (select referred_by from public.profiles where id = new.user_id);
    v_level   := 1;
    while v_current is not null and v_level <= 4 loop
      v_amount := (v_commissions ->> ('L' || v_level))::numeric;
      if v_amount is not null and v_amount > 0 then
        perform public.credit_wallet(
          v_current, v_amount, 'commission_l' || v_level, new.id,
          'Comisión nivel ' || v_level || ' por pedido pagado'
        );
      end if;
      v_current := (select referred_by from public.profiles where id = v_current);
      v_level   := v_level + 1;
    end loop;

  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
