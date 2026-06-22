-- 0030_seguridad_reservations_y_concurrencia.sql -------------------------------
-- Auditoría de seguridad: cierra 2 brechas detectadas.
--
-- Brecha 1: la tabla "reservations" se creó fuera de las migraciones
-- versionadas en una sesión anterior y nunca quedó registrado si tiene RLS
-- correcto. Esta migración la blinda explícitamente (idempotente: se puede
-- ejecutar aunque ya tenga RLS habilitado, sin romper nada).
--
-- Brecha 2: condición de carrera al asignar cupos de Fundador. Si dos
-- personas reservan/pagan el mismo paquete casi al mismo tiempo cerca del
-- límite, ambas transacciones podían leer el mismo conteo de cupos antes de
-- insertar, asignando números duplicados o superando el cupo. Se corrige
-- bloqueando la fila del paquete (FOR UPDATE) mientras se cuenta y asigna.
-- -----------------------------------------------------------------------------

-- Brecha 1: blindar reservations -----------------------------------------------
alter table public.reservations enable row level security;

drop policy if exists "reservations_select_own_or_admin" on public.reservations;
create policy "reservations_select_own_or_admin" on public.reservations
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

drop policy if exists "reservations_insert_own" on public.reservations;
create policy "reservations_insert_own" on public.reservations
  for insert with check (user_id = auth.uid());

-- Nadie (ni el propio usuario) puede actualizar o borrar reservas desde el
-- cliente — no hay política de update/delete, por lo que quedan denegadas
-- por defecto. Solo se gestionan internamente vía funciones del sistema.

-- Una persona solo puede tener una reserva activa
create unique index if not exists reservations_user_id_uidx on public.reservations (user_id);

-- Brecha 2: corregir condición de carrera en los triggers de Fundador --------
create or replace function public.handle_reservation_founder()
returns trigger as $$
declare
  v_package_code text;
  v_cap          int;
  v_taken        int;
begin
  select code, founder_cap into v_package_code, v_cap
    from public.packages where id = new.package_id
    for update;

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
        from public.packages where id = new.package_id
        for update;

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
