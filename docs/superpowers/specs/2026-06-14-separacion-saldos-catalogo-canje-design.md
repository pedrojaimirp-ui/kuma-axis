# Separación de saldos + Catálogo de canje — Diseño

> Proyecto 1 de 2 (el segundo es la Tienda Online de venta directa).
> Relacionado con: [2026-06-14-marco-operacional-legal-design.md](./2026-06-14-marco-operacional-legal-design.md)
> (sección 8: cierra el riesgo de que la ruleta sea vista como "juego de
> suerte y azar" por Coljuegos, al dejar de pagar premios en dinero).

## Objetivo

Hoy todo (comisiones por venta + premios de ruleta) entra al mismo saldo
("puntos KCA") y se puede canjear por transferencia bancaria. Esto mezcla
dos cosas legalmente distintas:

- **Comisiones por venta**: dinero real, ganado por ventas documentadas en
  la red de distribuidores.
- **Premios de ruleta**: un juego de azar, cuyo premio hoy es convertible a
  dinero — esto es justo lo que puede caer bajo regulación de Coljuegos.

La solución: **dos saldos separados**.

1. **Comisiones por venta** (dinero, canjeable por transferencia — esto ya
   existe, no cambia).
2. **Puntos de fidelización** (nuevo — ganado solo con la ruleta, canjeable
   ÚNICAMENTE por un catálogo de premios, nunca por dinero).

---

## 1. Modelo de datos

### 1.1 `wallets` — nueva columna

```sql
alter table public.wallets
  add column loyalty_points_balance integer not null default 0;
```

Todos los usuarios existentes arrancan en `0`. El saldo actual de
`balance_available`/`balance_locked` **no se modifica** — sigue siendo
100% "Comisiones por venta", tal como los usuarios ya lo conocen.

### 1.2 Catálogo de premios — constante en código (no tabla)

El catálogo es fijo y pequeño (4 ítems), así que vive como una constante en
`lib/constants.ts`, igual que `ROULETTE_PRIZES`:

```ts
export type RewardCode = 'extra_spin' | 'discount_5000' | 'discount_10000' | 'free_bag'

export interface RewardCatalogItem {
  code: RewardCode
  label: string
  description: string
  pointsCost: number
  kind: 'extra_spin' | 'voucher'
  voucherDiscount?: number // solo para kind === 'voucher'
}

export const REWARD_CATALOG: RewardCatalogItem[] = [
  {
    code: 'extra_spin',
    label: '🎰 1 giro extra de ruleta',
    description: 'Suma un giro adicional a tu ruleta de fidelización.',
    pointsCost: 50,
    kind: 'extra_spin',
  },
  {
    code: 'discount_5000',
    label: '🎟️ $5.000 de descuento',
    description: 'Cupón de $5.000 de descuento en tu próxima compra.',
    pointsCost: 500,
    kind: 'voucher',
    voucherDiscount: 5000,
  },
  {
    code: 'discount_10000',
    label: '🎟️ $10.000 de descuento',
    description: 'Cupón de $10.000 de descuento en tu próxima compra.',
    pointsCost: 1000,
    kind: 'voucher',
    voucherDiscount: 10000,
  },
  {
    code: 'free_bag',
    label: '🍫 1 bolsa de chocolate gratis (250g)',
    description: 'Cupón equivalente al valor de una bolsa, aplicado como descuento en tu próxima compra.',
    pointsCost: 1800,
    kind: 'voucher',
    voucherDiscount: 15000,
  },
]
```

`free_bag` se implementa como un cupón de descuento de $15.000 (valor de
mercado de una bolsa de 250g) — mismo mecanismo que los descuentos, sin
necesidad de manejar inventario o envíos separados.

### 1.3 Tabla nueva `reward_redemptions` (historial de canjes)

```sql
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  reward_code text not null,
  points_spent integer not null,
  created_at timestamptz not null default now()
);

alter table public.reward_redemptions enable row level security;

create policy reward_redemptions_select_own
  on public.reward_redemptions for select
  using (auth.uid() = user_id);
```

### 1.4 Tabla nueva `reward_vouchers` (cupones pendientes de usar)

```sql
create table public.reward_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  discount_amount numeric not null,
  status text not null default 'available' check (status in ('available', 'used')),
  source_reward_code text not null,
  used_order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.reward_vouchers enable row level security;

create policy reward_vouchers_select_own
  on public.reward_vouchers for select
  using (auth.uid() = user_id);
```

---

## 2. Cambios en la ruleta (`spin_roulette()`)

Hoy, cuando `v_amount > 0`, la función llama `credit_wallet(...)` (dinero
real) y si `v_amount = 0` ("Vuelve y juega") devuelve un giro.

**Cambio:** cuando `v_amount > 0`, en vez de `credit_wallet`, se hace:

```sql
update public.wallets
  set loyalty_points_balance = loyalty_points_balance + v_amount,
      updated_at = now()
  where user_id = v_user_id;
```

Todo lo demás de la función (probabilidades, etiquetas `$50`...`$10.000`,
`spin_history`, animación de la ruleta, confeti) **no cambia** — solo
cambia el destino del premio: de "saldo de dinero" a "puntos de
fidelización". Las etiquetas como `$500` se interpretan ahora como "500
puntos".

---

## 3. RPC nueva: `redeem_loyalty_reward(reward_code)`

```sql
create or replace function public.redeem_loyalty_reward(p_reward_code text)
returns void as $
declare
  v_user_id uuid := auth.uid();
  v_points_cost int;
  v_discount numeric;
begin
  -- valores fijos del catálogo (deben coincidir con REWARD_CATALOG)
  case p_reward_code
    when 'extra_spin' then v_points_cost := 50;
    when 'discount_5000' then v_points_cost := 500;
    when 'discount_10000' then v_points_cost := 1000;
    when 'free_bag' then v_points_cost := 1800;
    else raise exception 'Premio no válido';
  end case;

  update public.wallets
    set loyalty_points_balance = loyalty_points_balance - v_points_cost,
        updated_at = now()
    where user_id = v_user_id
      and loyalty_points_balance >= v_points_cost;

  if not found then
    raise exception 'No tienes suficientes puntos de fidelización';
  end if;

  if p_reward_code = 'extra_spin' then
    update public.spin_credits
      set referral_spins_balance = referral_spins_balance + 1,
          updated_at = now()
      where user_id = v_user_id;
  else
    v_discount := case p_reward_code
      when 'discount_5000' then 5000
      when 'discount_10000' then 10000
      when 'free_bag' then 15000
    end;

    insert into public.reward_vouchers (user_id, discount_amount, source_reward_code)
    values (v_user_id, v_discount, p_reward_code);
  end if;

  insert into public.reward_redemptions (user_id, reward_code, points_spent)
  values (v_user_id, p_reward_code, v_points_cost);
end;
$ language plpgsql security definer set search_path = public;

grant execute on function public.redeem_loyalty_reward(text) to authenticated;
```

---

## 4. Pantalla "Billetera" — dos tarjetas (Opción A)

```
┌─────────────────────────────────────────┐
│  💰 COMISIONES POR VENTA                 │
│  $45.000                                  │
│  [ Canjear puntos ]  (= solicitar        │
│     transferencia, ya existe)            │
├─────────────────────────────────────────┤
│  🎁 PUNTOS DE FIDELIZACIÓN               │
│  1.250 pts                                │
│  [ Ver catálogo de premios ]             │
│                                            │
│  Tus cupones disponibles:                │
│  • 🎟️ $5.000 de descuento                │
│  • 🍫 1 bolsa de chocolate gratis        │
└─────────────────────────────────────────┘
```

- La tarjeta de **Comisiones por venta** es el `WithdrawalForm` actual,
  sin cambios funcionales (solo se reordena visualmente dentro de su
  propia tarjeta).
- La tarjeta de **Puntos de fidelización** es nueva:
  - Muestra `loyalty_points_balance`.
  - Botón "Ver catálogo de premios" → navega a `/billetera/canjear`.
  - Lista los `reward_vouchers` con `status = 'available'` del usuario.

---

## 5. Pantalla nueva "Catálogo de premios" (`/billetera/canjear`)

- Lista los 4 ítems de `REWARD_CATALOG` con su costo en puntos.
- Si `loyalty_points_balance >= pointsCost` → botón "Canjear" activo.
- Si no → botón deshabilitado con texto "Te faltan N puntos".
- Al hacer clic en "Canjear" → llama a la server action que ejecuta
  `redeem_loyalty_reward(reward_code)`, refresca el saldo y la lista de
  cupones/giros.

---

## 6. Integración con la compra (`PurchaseForm`)

- Al cargar la pantalla de pago de un paquete, se consultan los
  `reward_vouchers` del usuario con `status = 'available'`.
- Si existe al menos uno, se muestra: *"Tienes un cupón de $X de
  descuento disponible — se aplicará a esta compra."* con un checkbox para
  aplicarlo (marcado por defecto).
- Si se aplica, el precio mostrado y el precio enviado a `createOrder` /
  `purchaseWithBalance` se reduce por `discount_amount`.
- Al confirmarse el pedido, el cupón usado se marca
  `status = 'used'`, `used_order_id = <id del pedido>`, `used_at = now()`.
- Si hay varios cupones disponibles, solo se puede aplicar **uno por
  compra** (el de mayor valor se sugiere primero).

---

## 7. Migración y compatibilidad

- `loyalty_points_balance` nuevo, default `0` — no afecta saldos actuales.
- `balance_available` / `balance_locked` no se tocan — "Comisiones por
  venta" sigue funcionando exactamente igual que hoy.
- `spin_roulette()` se modifica para escribir en `loyalty_points_balance`
  en vez de `credit_wallet`, a partir de la fecha en que se aplique la
  migración. Premios de ruleta anteriores a este cambio no se recalculan.
- Tipos TypeScript (`lib/types.ts`): agregar `loyalty_points_balance` a
  `Wallet`, y los tipos `RewardVoucher`, `RewardRedemption`,
  `RewardCatalogItem`.

---

## 8. Fuera de alcance (fase 2, no en este proyecto)

- Premios "exclusivos" de alto valor / merchandising (Opción 3 descartada
  por ahora).
- Tienda online de venta directa (proyecto 2, spec separado).
- Aplicar más de un cupón por compra.
