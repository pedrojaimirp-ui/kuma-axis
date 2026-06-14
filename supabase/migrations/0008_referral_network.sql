-- Red de referidos por niveles de profundidad ----------------------------
-- Las politicas RLS de profiles solo permiten ver tu propia fila, asi que
-- el listado de invitados directos (y por niveles) necesita una funcion
-- security definer. Siempre opera sobre auth.uid() -- nunca recibe un id
-- arbitrario -- para que un usuario solo pueda ver su propia red.

create or replace function public.get_referral_network()
returns table(level int, id uuid, full_name text) as $$
  with recursive network as (
    select 1 as level, p.id, p.full_name
    from public.profiles p
    where p.referred_by = auth.uid()

    union all

    select n.level + 1, p.id, p.full_name
    from public.profiles p
    join network n on p.referred_by = n.id
    where n.level < 4
  )
  select level, id, full_name from network order by level;
$$ language sql security definer stable set search_path = public;

grant execute on function public.get_referral_network() to authenticated;
