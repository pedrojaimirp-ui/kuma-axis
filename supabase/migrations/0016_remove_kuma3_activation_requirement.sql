-- Elimina el requisito de 10 referidos directos para comprar Paquete Familiar.
-- Con el modelo de plataforma abierta cualquier cliente puede comprar sin restricciones.
update public.packages
set activation_requirement = null
where code = 'kuma3';
