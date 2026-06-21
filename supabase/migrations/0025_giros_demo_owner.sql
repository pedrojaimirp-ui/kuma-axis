-- 0025_giros_demo_owner.sql ----------------------------------------------
-- Otorga giros de demostracion al dueño (Pedro Jaimir Pedraza Guerrero)
-- para que pueda mostrar como funciona la ruleta y que premios se pueden
-- ganar, sin afectar el fondo real: las estadisticas del panel admin ya
-- excluyen a admin/owner (ver app/admin/page.tsx).
-- ---------------------------------------------------------------------------

insert into public.spin_credits (user_id, referral_spins_balance)
select id, 50
  from public.profiles
  where role = 'owner'
on conflict (user_id) do update
  set referral_spins_balance = spin_credits.referral_spins_balance + 50,
      updated_at = now();
