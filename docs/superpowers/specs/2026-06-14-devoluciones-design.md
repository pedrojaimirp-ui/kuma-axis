# Diseño: Derecho de retracto / Devoluciones

## Contexto

Punto 5 del marco operacional/legal (`docs/superpowers/specs/2026-06-14-marco-operacional-legal-design.md`):
la Ley 1480 de 2011 (Estatuto del Consumidor) otorga al comprador 5 días hábiles desde
la entrega del producto para solicitar la devolución, siempre que el producto no haya
sido consumido y conserve su empaque original.

Hoy `orders.status` solo admite `pending_payment`, `paid`, `rejected` — no existe
ningún registro de la fecha de entrega, por lo que no hay forma de calcular el plazo
de 5 días hábiles. Tampoco existe ningún flujo para que el cliente solicite una
devolución ni para que el administrador la revise.

## Decisiones tomadas con el usuario

1. La entrega se registra manualmente: el **administrador** marca el pedido como
   "Entregado" desde el Panel de Administración (mismo patrón que hoy usa para marcar
   "Pagado"/"Rechazado"). Esa acción guarda la fecha/hora de entrega.
2. El cliente solicita la devolución desde "Mis pedidos", escribiendo un **motivo
   obligatorio** (texto libre). La solicitud queda pendiente de revisión del admin.
3. El plazo de 5 días hábiles (lunes a viernes, sin festivos) se cuenta desde la fecha
   de entrega. Pasado ese plazo, ya no se puede solicitar devolución para ese pedido.
4. Si el admin aprueba la devolución, se **acredita al saldo disponible** de la
   billetera del cliente el precio del paquete **menos el costo de envío** de ese
   paquete (mismo mecanismo que una comisión). El costo de envío no es reembolsable
   porque ya se incurrió en él para hacer llegar el producto al cliente.
5. Las comisiones (L1-L4) ya pagadas a la red por ese pedido **no se revierten**. KÚMA
   absorbe el costo del reembolso desde su margen. Esto es deliberado: evita saldos
   negativos en las billeteras de otros usuarios y mantiene la implementación simple.
   Las devoluciones deberían ser un caso poco frecuente si se cumplen las condiciones
   (producto sin abrir, empaque original).

## Cambios en base de datos

### `packages`

Nueva columna `shipping_cost numeric not null default 0` — costo de envío de cada
paquete, no reembolsable en caso de devolución.

| Paquete | `shipping_cost` |
|---|---|
| Personal | 10000 |
| Pareja | 15000 |
| Familiar | 20000 |

### `orders`

- Ampliar el `check` de `status` para admitir dos valores nuevos:
  `'pending_payment' | 'paid' | 'rejected' | 'delivered' | 'returned'`
- Agregar columna `delivered_at timestamptz` (null hasta que se marca como entregado).

Ciclo de vida de un pedido pagado: `paid` → `delivered` → (`returned`, si se aprueba
una devolución dentro del plazo) o se queda en `delivered` si no se solicita
devolución o el plazo vence.

### `return_requests` (tabla nueva)

Misma estructura que `withdrawal_requests` (`0003_billetera_comisiones.sql:53`):

```sql
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  user_id uuid not null references public.profiles (id),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
```

RLS: el cliente puede ver (`select`) sus propias solicitudes; el admin/owner puede ver
todas (`public.is_admin_or_owner()`, mismo helper usado en el resto del proyecto).
Solo se inserta vía la función `request_return` (security definer), no por insert
directo del cliente — mismo patrón que `withdrawal_requests` tras `0005_rls_hardening.sql`.

## Funciones (RPC, security definer, `set search_path = public`)

### `mark_order_delivered(p_order_id uuid)`
- Solo admin/owner (`public.is_admin_or_owner()`).
- Requiere que el pedido esté en estado `paid`.
- Actualiza `status = 'delivered'`, `delivered_at = now()`.

### `request_return(p_order_id uuid, p_reason text)`
- `auth.uid()` debe ser el dueño del pedido.
- El pedido debe estar en estado `delivered`.
- `p_reason` no puede ser vacío.
- No debe existir ya una solicitud `pending` o `approved` para ese pedido.
- Debe estar dentro de los 5 días hábiles desde `delivered_at` (función auxiliar
  `business_days_between(delivered_at, now()) <= 5`, contando solo lunes-viernes).
- Si todo es válido, inserta en `return_requests` con `status = 'pending'`.
- Si no es válido, `raise exception` con un mensaje claro (ej. "Ya pasaron los 5 días
  hábiles para solicitar la devolución de este pedido").

### `approve_return(p_return_id uuid)`
- Solo admin/owner.
- La solicitud debe estar en `pending`.
- Actualiza `return_requests.status = 'approved'`, `reviewed_by = auth.uid()`,
  `reviewed_at = now()`.
- Actualiza `orders.status = 'returned'` para el pedido asociado.
- Acredita `packages.price - packages.shipping_cost` (del paquete del pedido) a
  `wallets.balance_available` del cliente, y registra un `wallet_transactions` con
  `type = 'return_refund'`, `bucket = 'available'`, descripción
  "Reembolso por devolución de pedido (envío no reembolsable)".

### `reject_return(p_return_id uuid)`
- Solo admin/owner.
- La solicitud debe estar en `pending`.
- Actualiza `status = 'rejected'`, `reviewed_by = auth.uid()`, `reviewed_at = now()`.
- No se mueve dinero ni se cambia el estado del pedido (sigue en `delivered`).

### Función auxiliar `business_days_between(p_from timestamptz, p_to timestamptz)`
- Devuelve el número de días hábiles (lunes a viernes) entre dos fechas, sin contar
  festivos colombianos (fuera de alcance — ver sección "Fuera de alcance").
- Se usa internamente por `request_return` y, opcionalmente, expuesta para que la UI
  muestre "te quedan N días para solicitar devolución".

## Cambios en `wallet_transactions`

Agregar `'return_refund'` a la lista de valores permitidos en el `check` de `type`
(la lista actual incluye `'purchase_with_balance'`, `'withdrawal_request'`,
`'withdrawal_rejected'`, `'roulette_prize'`, etc. — ver `0006_ruleta.sql:45` y
migraciones relacionadas).

## Cambios en UI

### Panel de Administración (`app/(dashboard)/admin/page.tsx`)

- En la lista de pedidos con estado `paid`, agregar un botón **"Marcar como
  entregado"** que llama a `mark_order_delivered`.
- Nueva sección **"Devoluciones pendientes"**: lista las `return_requests` con
  `status = 'pending'`, mostrando el motivo, el pedido y el cliente. Botones
  **Aprobar** / **Rechazar** que llaman a `approve_return` / `reject_return`.

### Mis pedidos (`app/(dashboard)/tienda/pedidos/page.tsx`)

- Agregar etiquetas nuevas a `STATUS_LABELS`:
  - `delivered`: "Entregado"
  - `returned`: "Devuelto"
- Para pedidos en `delivered` dentro del plazo de 5 días hábiles y sin solicitud
  previa: botón **"Solicitar devolución"** que abre un formulario simple (textarea
  para el motivo) y llama a `request_return`.
- Si ya existe una solicitud `pending` para ese pedido, mostrar "Devolución
  solicitada, en revisión" en lugar del botón.
- Si la solicitud fue `rejected`, el pedido vuelve a mostrarse como `delivered` sin
  botón (el plazo de 5 días ya se evalúa de nuevo solo si sigue dentro del plazo —
  en la práctica, si fue rechazada normalmente ya no quedará tiempo para reintentar,
  pero la regla de "no debe existir ya una solicitud pending o approved" permite
  reintentar si el admin rechazó por error y aún queda plazo).

## Casos especiales y validaciones

- No se puede solicitar devolución de un pedido que no está `delivered` (ej. sigue
  `paid` o ya está `returned`).
- No se puede solicitar dos veces si ya hay una solicitud `pending` o `approved`.
- Pasados los 5 días hábiles desde `delivered_at`, `request_return` rechaza con
  mensaje claro y la UI oculta el botón.
- Las comisiones L1-L4 ya pagadas no se tocan (decisión 5 arriba).
- Compras pagadas con saldo (`purchase_with_balance`) siguen el mismo flujo: al
  aprobarse la devolución, el precio se acredita de nuevo al saldo disponible.

## Testing

- Pruebas unitarias (Vitest) para `business_days_between` cubriendo: mismo día,
  fin de semana intermedio, exactamente 5 días hábiles, más de 5 días hábiles.
- Pruebas de los RPC vía revisión manual/SQL (no hay infraestructura de tests de
  integración contra Supabase en este proyecto — se sigue el patrón existente de
  verificar manualmente tras aplicar la migración).

## Fuera de alcance (futuro)

- Festivos colombianos en el cálculo de días hábiles (hoy solo se excluyen
  sábados/domingos).
- Notificaciones automáticas (email/WhatsApp) al cliente o al admin cuando se
  crea/aprueba/rechaza una solicitud.
- Política de "producto sin abrir / empaque original" verificada automáticamente —
  hoy depende de la evaluación manual del admin al leer el motivo.
- Reversión de comisiones de la red (decisión deliberada de no implementarlo, ver
  decisión 5).
