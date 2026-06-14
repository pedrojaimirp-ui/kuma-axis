-- KUMA 3 ya no requiere invitados directos para activarse.
update public.packages set activation_requirement = null where code = 'kuma3';
