-- 0027_fundador_por_paquete.sql -----------------------------------------------
-- Club de Fundadores KÚMA: cupos limitados por paquete.
--   Personal (kuma1): 80 cupos
--   Pareja   (kuma2): 50 cupos
--   Familiar (kuma3): 20 cupos
-- Al primer pedido pagado de cada usuario, si todavía quedan cupos para el
-- paquete comprado, se le asigna automáticamente un número de Fundador.
-- Si los cupos ya se agotaron, el usuario simplemente sigue con los niveles
-- normales (Catador/Chocolatero/etc.) sin ningún error.
-- -----------------------------------------------------------------------------

alter table public.packages
  add column if not exists founder_cap int not null default 0;

update public.packages set founder_cap = 80 where code = 'kuma1';
update public.packages set founder_cap = 50 where code = 'kuma2';
update public.packages set founder_cap = 20 where code = 'kuma3';

create table public.founder_badges (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  package_code text not null,
  founder_number int not null,
  created_at timestamptz not null default now()
);

alter table public.founder_badges enable row level security;

create policy "founder_badges_select_own_or_admin" on public.founder_badges
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

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

    -- Solo aplica en la primera compra pagada del usuario
    if v_prior_paid = 0 then
      select code, founder_cap into v_package_code, v_cap
        from public.packages where id = new.package_id;

      if v_cap > 0 then
        select count(*) into v_taken
          from public.founder_badges where package_code = v_package_code;

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

create trigger orders_paid_founder_badge
  after update on public.orders
  for each row execute procedure public.handle_order_paid_founder();
