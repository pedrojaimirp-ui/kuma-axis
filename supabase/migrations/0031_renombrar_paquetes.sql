-- 0031_renombrar_paquetes.sql --------------------------------------------------
-- Renombra los paquetes con identidad de marca KÚMA.
--   Personal -> KÚMA ORIGEN
--   Pareja   -> KÚMA ESENCIA
--   Familiar -> KÚMA LEGADO
-- -----------------------------------------------------------------------------

update public.packages set name = 'KÚMA ORIGEN'  where code = 'kuma1';
update public.packages set name = 'KÚMA ESENCIA' where code = 'kuma2';
update public.packages set name = 'KÚMA LEGADO'  where code = 'kuma3';
