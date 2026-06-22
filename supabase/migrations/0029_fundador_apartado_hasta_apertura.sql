-- 0029_fundador_apartado_hasta_apertura.sql ------------------------------------
-- Cambia el Club de Fundadores: el cupo se asigna desde el momento en que la
-- persona RESERVA (gratis), quedando en estado "apartado" (confirmed = false).
-- Si paga su primer pedido para ese mismo paquete, el cupo queda confirmado
-- para siempre (confirmed = true). Los cupos nunca confirmados se liberan
-- manualmente el día de la apertura oficial, con un botón en el panel admin.
-- -----------------------------------------------------------------------------

alter table public.founder_badges
  add column if not exists confirmed boolean not null default false;

-- Los badges que ya existen (otorgados por pago real o demo) quedan confirmados
update public.founder_badges set confirmed = true;

-- 1. Al reservar, se aparta el cupo (si todavía hay disponibles) sin confirmar
create or replace function public.handle_reservation_founder()
returns trigger as $$
declare
  v_package_code text;
  v_cap          int;
  v_taken        int;
begin
  select code, founder_cap into v_package_code, v_cap
    from public.packages where id = new.package_id;

  if v_cap > 0 then
    select count(*) into v_taken
      from public.founder_badges fb
      join public.profiles p on p.id = fb.user_id
      where fb.package_code = v_package_code
        and p.role not in ('admin', 'owner');

    if v_taken < v_cap then
      insert into public.founder_badges (user_id, package_code, founder_number, confirmed)
      values (new.user_id, v_package_code, v_taken + 1, false)
      on conflict (user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger reservations_founder_badge
  after insert on public.reservations
  for each row execute procedure public.handle_reservation_founder();

-- 2. Al pagar, si ya tenía un cupo apartado para ese mismo paquete, se confirma.
--    Si no tenía reserva previa (caso raro), se le asigna uno nuevo ya confirmado.
create or replace function public.handle_order_paid_founder()
returns trigger as $$
declare
  v_package_code  text;
  v_cap           int;
  v_taken         int;
  v_prior_paid    int;
  v_existing_pkg  text;
begin
  if new.status = 'paid' and old.status <> 'paid' then

    select count(*) into v_prior_paid
      from public.orders
      where user_id = new.user_id and status = 'paid' and id <> new.id;

    if v_prior_paid = 0 then
      select code, founder_cap into v_package_code, v_cap
        from public.packages where id = new.package_id;

      select package_code into v_existing_pkg
        from public.founder_badges where user_id = new.user_id;

      if v_existing_pkg is not null and v_existing_pkg = v_package_code then
        update public.founder_badges
          set confirmed = true
          where user_id = new.user_id;
      elsif v_existing_pkg is null and v_cap > 0 then
        select count(*) into v_taken
          from public.founder_badges fb
          join public.profiles p on p.id = fb.user_id
          where fb.package_code = v_package_code
            and p.role not in ('admin', 'owner');

        if v_taken < v_cap then
          insert into public.founder_badges (user_id, package_code, founder_number, confirmed)
          values (new.user_id, v_package_code, v_taken + 1, true)
          on conflict (user_id) do nothing;
        end if;
      end if;
    end if;

  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Función de apertura oficial: libera todos los cupos nunca confirmados
create or replace function public.release_unconfirmed_founder_badges()
returns void as $$
begin
  if not public.is_admin_or_owner() then
    raise exception 'No autorizado';
  end if;

  delete from public.founder_badges where confirmed = false;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.release_unconfirmed_founder_badges() to authenticated;
