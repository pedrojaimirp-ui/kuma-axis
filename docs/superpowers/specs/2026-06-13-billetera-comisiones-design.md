# Billetera + Comisiones automáticas — Diseño

**Fecha:** 2026-06-13
**Estado:** Aprobado, pendiente de plan de implementación
**Depende de:** Fase 1 (registro, tienda, pedidos, panel admin) — completada.
**Siguiente proyecto (no incluido aquí):** Red (árbol de referidos visual), Ruleta (giros y premios).

## 1. Objetivo

Construir el motor de comisiones automáticas y la Billetera ($KCA) de cada
usuario: cuando un pedido pasa a estado `paid`, se reparten comisiones a la
cadena de referidos (niveles 1-4) y al dueño de la plataforma (comisión
global), y cada usuario puede ver su saldo, usarlo para comprar paquetes, o
solicitar un retiro en dinero real.

Incluye además dos mejoras pequeñas a la pantalla de pago y al panel admin
que comparten el mismo flujo de "pedido pagado":

- Casilla de referencia/comprobante de pago en pedidos por transferencia.
- Código QR de pago (Bre-B) junto a los datos de cuenta existentes.

## 2. Fuera de alcance (proyectos futuros)

- Red: vista de árbol/lista de referidos (usa los mismos datos de
  `referred_by`, pero es una pantalla separada — proyecto siguiente).
- Ruleta: giros diarios/por referido y premios.
- Vencimiento mensual de "activación" (recompra automática real). Por ahora
  "activo" = ha tenido al menos un pedido `paid` alguna vez, para siempre.
- Verificación automática de pagos bancarios vía API de bancos (no viable
  sin convenios bancarios empresariales).

## 3. Modelo de datos

### 3.1 Tabla nueva: `wallets`

Una fila por usuario, saldo agregado para lecturas rápidas.

```sql
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_available numeric not null default 0,
  balance_locked numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "wallets_select_own_or_admin" on public.wallets
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );
```

No hay policy de `insert`/`update` para usuarios: todas las modificaciones
de saldo las hacen funciones `security definer` (triggers / RPCs), nunca el
cliente directamente.

Se crea una fila en `wallets` para cada usuario nuevo, igual que se crea su
fila en `profiles` (mismo trigger `handle_new_user`, ver 3.5).

### 3.2 Tabla nueva: `wallet_transactions`

Historial de movimientos (extracto), nunca se borra ni edita.

```sql
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  amount numeric not null, -- positivo = entra, negativo = sale
  type text not null check (type in (
    'commission_l1', 'commission_l2', 'commission_l3', 'commission_l4',
    'owner_global', 'unlock', 'purchase_with_balance',
    'withdrawal_request', 'withdrawal_rejected'
  )),
  bucket text not null check (bucket in ('available', 'locked')),
  related_order_id uuid references public.orders (id),
  related_withdrawal_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

create policy "wallet_transactions_select_own_or_admin" on public.wallet_transactions
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );
```

`bucket` indica a qué saldo afectó el movimiento (`available` o `locked`).
Para `unlock`, se inserta un registro con `amount` igual al total
desbloqueado, `bucket = 'available'`, `type = 'unlock'`.

### 3.3 Tabla nueva: `withdrawal_requests`

```sql
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  amount numeric not null check (amount > 0),
  destination text not null, -- ej: "Nequi 321XXXXXXX" escrito por el usuario
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.withdrawal_requests enable row level security;

create policy "withdrawal_requests_select_own_or_admin" on public.withdrawal_requests
  for select using (
    user_id = auth.uid()
    or public.is_admin_or_owner()
  );

create policy "withdrawal_requests_insert_own" on public.withdrawal_requests
  for insert with check (user_id = auth.uid());

create policy "withdrawal_requests_update_admin" on public.withdrawal_requests
  for update using (public.is_admin_or_owner());
```

### 3.4 Cambios a `orders`

```sql
alter table public.orders add column payment_reference text;
```

Campo opcional, lo llena el usuario en la pantalla de pago cuando transfiere
por Nequi/Davivienda. Se muestra en el panel admin junto al pedido.

### 3.5 Función: crear wallet al registrarse

Se modifica el trigger existente `handle_new_user` (en
`0001_init.sql`/migración nueva) para también insertar la fila en `wallets`:

```sql
-- dentro de handle_new_user, después del insert en profiles:
insert into public.wallets (user_id) values (new.id);
```

### 3.6 Función: `is_active(user_id uuid)`

```sql
create function public.is_active(p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.orders
    where user_id = p_user_id and status = 'paid'
  );
$$ language sql security definer stable set search_path = public;
```

### 3.7 Función: `credit_wallet(user_id, amount, type, related_order_id, description)`

Función auxiliar `security definer`, usada por el trigger de comisiones:

1. Si `public.is_active(user_id)` es verdadero → suma `amount` a
   `wallets.balance_available` e inserta `wallet_transactions` con
   `bucket = 'available'`.
2. Si no → suma `amount` a `wallets.balance_locked` e inserta
   `wallet_transactions` con `bucket = 'locked'`.

### 3.8 Trigger: reparto de comisiones al marcar pedido como `paid`

```sql
create function public.handle_order_paid()
returns trigger as $$
declare
  v_commissions jsonb;
  v_price numeric;
  v_owner_percent numeric;
  v_current uuid;
  v_level int;
  v_amount numeric;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select commissions_json, price into v_commissions, v_price
      from public.packages where id = new.package_id;

    select owner_commission_percent into v_owner_percent
      from public.platform_settings where id = 1;

    -- comisión global del dueño (no depende de la cadena de referidos)
    perform public.credit_wallet(
      (select id from public.profiles where role = 'owner' limit 1),
      round(v_price * v_owner_percent / 100, 2),
      'owner_global', new.id,
      'Comisión global ' || v_owner_percent || '% sobre pedido'
    );

    -- niveles 1 a 4, subiendo por referred_by
    v_current := (select referred_by from public.profiles where id = new.user_id);
    v_level := 1;
    while v_current is not null and v_level <= 4 loop
      v_amount := (v_commissions ->> ('L' || v_level))::numeric;
      if v_amount is not null and v_amount > 0 then
        perform public.credit_wallet(
          v_current, v_amount, 'commission_l' || v_level, new.id,
          'Comisión nivel ' || v_level || ' por pedido pagado'
        );
      end if;
      v_current := (select referred_by from public.profiles where id = v_current);
      v_level := v_level + 1;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger orders_paid_commissions
  after update on public.orders
  for each row execute procedure public.handle_order_paid();
```

Notas:

- Si la cadena de referidos es más corta que 4 niveles, el `while` simplemente
  termina antes — esos niveles no se reparten a nadie.
- Si `old.status` ya era `paid` (ej. una actualización que no cambia el
  estado), no se vuelve a ejecutar — las comisiones se reparten **una sola
  vez** por pedido.
- Rechazar un pedido (`status = 'rejected'`) nunca dispara este trigger.

### 3.9 Trigger: desbloqueo de saldo congelado al activarse

```sql
create function public.handle_order_paid_unlock()
returns trigger as $$
declare
  v_locked numeric;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    select balance_locked into v_locked from public.wallets where user_id = new.user_id;
    if v_locked > 0 then
      update public.wallets
        set balance_available = balance_available + v_locked,
            balance_locked = 0,
            updated_at = now()
        where user_id = new.user_id;

      insert into public.wallet_transactions (user_id, amount, type, bucket, related_order_id, description)
      values (new.user_id, v_locked, 'unlock', 'available', new.id,
              'Saldo congelado desbloqueado por activación');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger orders_paid_unlock
  after update on public.orders
  for each row execute procedure public.handle_order_paid_unlock();
```

Este trigger corre **antes o después** del de comisiones sin conflicto: el
desbloqueo afecta el saldo que la persona ya tenía acumulado de pedidos
*anteriores*; las comisiones de *este* pedido se reparten a la cadena hacia
arriba (otros usuarios), no a quien compró.

### 3.10 RPC: comprar con saldo (`purchase_with_balance`)

```sql
create function public.purchase_with_balance(
  p_package_code text,
  p_shipping_address jsonb,
  p_auto_renew boolean
)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_package_id uuid;
  v_price numeric;
  v_balance numeric;
  v_order_id uuid;
begin
  select id, price into v_package_id, v_price
    from public.packages where code = p_package_code;

  select balance_available into v_balance
    from public.wallets where user_id = v_user_id for update;

  if v_balance < v_price then
    raise exception 'Saldo insuficiente';
  end if;

  update public.wallets
    set balance_available = balance_available - v_price, updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, description)
  values (v_user_id, -v_price, 'purchase_with_balance', 'available',
          'Compra de paquete con saldo $KCA');

  insert into public.orders (user_id, package_id, shipping_address, auto_renew, status)
  values (v_user_id, v_package_id, p_shipping_address, p_auto_renew, 'paid')
  returning id into v_order_id;

  return v_order_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.purchase_with_balance(text, jsonb, boolean) to authenticated;
```

Al insertar el pedido con `status = 'paid'` directamente, los triggers 3.8 y
3.9 se disparan igual que con un pedido aprobado por el admin — comisiones y
desbloqueo se reparten igual.

### 3.11 RPC: solicitar retiro (`request_withdrawal`)

```sql
create function public.request_withdrawal(p_amount numeric, p_destination text)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Monto inválido';
  end if;

  select balance_available into v_balance
    from public.wallets where user_id = v_user_id for update;

  if v_balance < p_amount then
    raise exception 'Saldo insuficiente';
  end if;

  update public.wallets
    set balance_available = balance_available - p_amount, updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions (user_id, amount, type, bucket, description)
  values (v_user_id, -p_amount, 'withdrawal_request', 'available', 'Solicitud de retiro');

  insert into public.withdrawal_requests (user_id, amount, destination)
  values (v_user_id, p_amount, p_destination)
  returning id into v_id;

  update public.wallet_transactions
    set related_withdrawal_id = v_id
    where id = (select id from public.wallet_transactions
                where user_id = v_user_id and type = 'withdrawal_request'
                order by created_at desc limit 1);

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.request_withdrawal(numeric, text) to authenticated;
```

El monto se descuenta del saldo **al momento de solicitar** (evita que la
persona solicite dos retiros con el mismo dinero). Si el admin rechaza la
solicitud, se le devuelve (ver 3.12).

### 3.12 Admin: aprobar/rechazar retiro

Se hace desde el código de la aplicación (no RPC), igual que aprobar
pedidos:

- **Aprobar (`paid`):** solo actualiza `withdrawal_requests.status = 'paid'`,
  `reviewed_by`, `reviewed_at`. El dinero ya se descontó al solicitar.
- **Rechazar (`rejected`):** actualiza el estado **y** devuelve el saldo:

```sql
update public.wallets
  set balance_available = balance_available + (select amount from public.withdrawal_requests where id = $1),
      updated_at = now()
  where user_id = (select user_id from public.withdrawal_requests where id = $1);

insert into public.wallet_transactions (user_id, amount, type, bucket, related_withdrawal_id, description)
values (
  (select user_id from public.withdrawal_requests where id = $1),
  (select amount from public.withdrawal_requests where id = $1),
  'withdrawal_rejected', 'available', $1, 'Retiro rechazado, saldo devuelto'
);
```

Esto se hace dentro de una función `security definer`
`reject_withdrawal(p_id uuid)` ejecutable solo por admin/owner (verifica
`is_admin_or_owner()` al inicio, si no lanza excepción).

## 4. Excepciones del CEO/Owner

- **Comisión global:** el trigger 3.8 siempre acredita el `owner_commission_percent`
  (5% por defecto) de **cada** pedido pagado en toda la plataforma a la
  cuenta con `role = 'owner'`, sin importar la cadena de referidos. Esta
  comisión nunca se congela (el owner siempre se considera activo — ver
  siguiente punto).
- **`is_active` siempre verdadero para el owner:** se ajusta la función 3.6
  para que devuelva `true` directamente si `role = 'owner'`, sin necesidad de
  tener pedidos pagados propios.
- **Sin restricciones de activación:** al comprar KUMA 3
  (`activation_requirement: {"min_direct_referrals": 10}`), la verificación
  de "10 referidos directos" se omite si `role = 'owner'`. Esta verificación
  vive actualmente en la lógica de creación de pedido — se ajusta para
  exceptuar al owner.

## 5. Pantallas (UI)

### 5.1 Billetera (`app/.../billetera/page.tsx`, hoy placeholder)

- Saldo disponible: grande, verde, formateado como moneda (`$45.000`).
- Saldo congelado (solo si > 0): con ícono 🔒 y texto "Activa tu recompra y
  disfruta de tus ganancias" — enlaza a la tienda.
- Historial: lista de `wallet_transactions` del usuario, más recientes
  primero — fecha, descripción, monto (+ verde / - rojo).
- Botón "Solicitar retiro" → abre formulario (monto, destino) → llama RPC
  `request_withdrawal`. Deshabilitado si `balance_available = 0`.

### 5.2 Pantalla de pago (`components/PurchaseForm.tsx`)

- Se elimina la fila de texto "Nequi: 321 358 6024".
- Métodos de pago quedan: QR de Bre-B (imagen, incluye la llave
  `@DAVIPPG927` visible en la imagen) + fila de texto "Davivienda - Cuenta de
  ahorros: 4884 1069 8499".
- Nueva casilla opcional: "Número de referencia / comprobante de pago"
  (input de texto, se guarda en `orders.payment_reference`).
- Si `wallets.balance_available >= pkg.price`, se muestra un botón adicional
  "Pagar con mi saldo $KCA ($X disponibles)" que llama
  `purchase_with_balance` y redirige directo a "Mis pedidos" (sin pasar por
  "pendiente").

### 5.3 Panel admin (`app/admin/page.tsx`)

- En cada pedido pendiente, si `payment_reference` no es null, se muestra:
  "Referencia: XXXXX".
- Nueva sección "Retiros pendientes" debajo de pedidos pendientes: lista de
  `withdrawal_requests` con `status = 'pending'`, mostrando nombre,
  teléfono, monto y destino, con botones "Marcar pagado" / "Rechazar".

## 6. Ejemplo completo (referencia)

Cadena: CEO → Ana → Beto → Carla → Diego → Elena. Elena compra KUMA 1
($75.000, comisiones L1=$5.000, L2=$2.000, L3=$3.500, L4=$1.000) y el admin
marca el pedido `paid`.

| Beneficiario | Relación | Monto | ¿Activo? | Resultado |
|---|---|---|---|---|
| Diego | Nivel 1 (invitó a Elena) | $5.000 | No | → `balance_locked` + 🔒 |
| Carla | Nivel 2 | $2.000 | Sí | → `balance_available` |
| Beto | Nivel 3 | $3.500 | Sí | → `balance_available` |
| Ana | Nivel 4 | $1.000 | Sí | → `balance_available` |
| CEO (owner) | Comisión global 5% | $3.750 | (siempre activo) | → `balance_available` |

Si más adelante Diego compra cualquier paquete y su pedido pasa a `paid`, su
`balance_locked` ($5.000 + lo que se haya acumulado mientras tanto) se mueve
completo a `balance_available` (trigger 3.9).

## 7. Errores y casos límite

- **Pedido rechazado:** no dispara ningún trigger de comisiones/desbloqueo.
- **Pedido marcado `paid` dos veces** (no debería pasar, pero por seguridad):
  el trigger solo actúa si `old.status <> 'paid'`, así que no se duplican
  comisiones.
- **Cadena de referidos corta:** niveles sin referido superior simplemente no
  reparten esa comisión (no hay "huérfanos" ni redistribución).
- **Saldo insuficiente al comprar/retirar:** las funciones `purchase_with_balance`
  y `request_withdrawal` lanzan una excepción clara ("Saldo insuficiente")
  que la app muestra como mensaje de error.
- **No existe usuario con `role = 'owner'`:** el trigger 3.8 hace
  `select ... limit 1`; si no hay ninguno, `credit_wallet` recibiría
  `user_id = null` y fallaría. En la práctica siempre habrá exactamente un
  owner (la cuenta del CEO ya está configurada así), pero se documenta como
  invariante del sistema.

## 8. Pruebas

- Pruebas unitarias de `lib/phone.ts` y similares no se ven afectadas.
- El cálculo de comisiones, desbloqueo y RPCs se prueban con pruebas SQL
  (insertar perfiles encadenados + paquete + pedido, actualizar a `paid`,
  verificar `wallets`/`wallet_transactions` resultantes) o con pruebas de
  integración E2E (Playwright) reutilizando el flujo ya probado en Fase 1
  (registro → compra → admin aprueba → verificar saldo).
- Casos a cubrir: cadena completa de 4 niveles, cadena corta, beneficiario
  congelado luego desbloqueado, comisión global del owner, compra con saldo,
  retiro aprobado, retiro rechazado (devuelve saldo), restricción KUMA 3
  exceptuada para owner.
