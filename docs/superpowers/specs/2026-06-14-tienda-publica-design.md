# Tienda pública / Compra sin red de referidos — Diseño

> Implementa el punto #7 del marco operacional legal
> (`docs/superpowers/specs/2026-06-14-marco-operacional-legal-design.md`):
> habilitar la compra de chocolate KÚMA sin necesidad de un código de
> referido ni de "activarse" en el programa de fidelización.

## Contexto actual

- `app/page.tsx` (ruta `/`) hoy redirige siempre: si hay sesión va a
  `/inicio`, si no hay sesión va a `/login`. No existe ninguna página
  pública que explique el producto.
- `app/(auth)/register/page.tsx` ya permite registrarse sin `?ref=...`
  (en ese caso `referred_by` queda `null`), pero el texto de la pantalla
  ("🍫 Red de consumo 100% cacao puro") enmarca el registro como entrar a
  una red de referidos, incluso para quien no trae un enlace de referido.
- La tabla `public.packages` tiene la política `packages_select_all`
  (`for select using (true)`), por lo que se puede leer sin autenticación.
- El middleware (`middleware.ts`) no incluye `/` en `PROTECTED_PREFIXES`,
  así que la ruta raíz ya es accesible sin sesión.

## Cambios propuestos

### 1. Landing pública en `/`

`app/page.tsx` deja de redirigir incondicionalmente a usuarios sin sesión:

- **Con sesión activa:** se mantiene el comportamiento actual,
  `redirect('/inicio')`.
- **Sin sesión:** en vez de redirigir a `/login`, se renderiza una nueva
  landing pública (`app/page.tsx` mismo, server component) con:
  - Encabezado: "KÚMA CACAO AXIS — Chocolate 100% cacao puro".
  - Tarjetas con los 3 paquetes (KUMA 1/2/3): nombre, número de bolsas y
    precio, leídos en vivo de `public.packages` (igual que
    `app/(dashboard)/tienda/page.tsx`, reutilizando `PackageCard` o una
    variante de solo lectura sin botón de compra).
  - Botón primario **"Crear cuenta y comprar"** → `/register`.
  - Botón secundario **"Ya tengo cuenta"** → `/login`.
  - Texto enfocado en el producto (ingredientes, calidad, 100% cacao);
    sin mencionar red de referidos, comisiones, ruleta ni puntos de
    fidelización.

No se necesita ningún cambio en `middleware.ts`: `/` ya es accesible sin
sesión.

### 2. Texto condicional en `/register`

`app/(auth)/register/page.tsx` ya lee `refCode = searchParams.get('ref')`.
Se usa ese valor (presente vs. ausente) para decidir el texto de
presentación, sin afectar la lógica de envío (que ya maneja `refCode`
correctamente):

- **Si `refCode` está presente** (vino de un enlace de un referido): se
  mantiene el texto actual:
  - Título: "KÚMA CACAO AXIS"
  - Subtítulo: "🍫 Red de consumo 100% cacao puro"

- **Si `refCode` es `null`** (entró por el enlace genérico / landing
  pública): texto neutro orientado a cliente:
  - Título: "KÚMA CACAO AXIS"
  - Subtítulo: "🍫 Crea tu cuenta para comprar chocolate 100% cacao"

No cambia ningún campo del formulario ni la lógica de `handleSubmit`:
con `refCode = null`, `referredBy` ya queda `null` como hoy.

### 3. Sin cambios de base de datos

La cuenta creada sin `?ref=` es una cuenta normal: tiene su propio
`referral_code` (por si más adelante quiere invitar a alguien) y
`referred_by = null`. Esto es exactamente la evidencia que pide el punto
#7: ventas a clientes que no entraron buscando comisiones.

## Fuera de alcance (YAGNI)

- Checkout como invitado (sin cuenta) — requeriría rediseñar RLS de
  `orders` y la relación `orders.user_id -> profiles.id`. No es necesario
  para cumplir el punto #7.
- Fotos/galería de producto — se puede agregar después; esta landing usa
  solo texto y los datos ya existentes en `packages`.
- Cambios al flujo de `/inicio`, `/red`, `/billetera` para cuentas sin
  referidor: una cuenta sin `referred_by` funciona igual que cualquier
  otra (puede referir a otros, comprar, etc.) — no requiere lógica
  especial.

## Testing

- `npm test` debe seguir pasando (25/25 o más).
- `npm run build` debe incluir la nueva ruta `/` como página renderizable
  para ambos casos (con y sin sesión) — verificar manualmente:
  - Visitar `/` sin sesión → landing pública con los 3 paquetes y precios
    correctos, botones a `/register` y `/login`.
  - Visitar `/` con sesión → redirige a `/inicio` (sin cambios).
  - Visitar `/register` sin `?ref=` → subtítulo "Crea tu cuenta para
    comprar chocolate 100% cacao".
  - Visitar `/register?ref=<código válido>` → subtítulo "Red de consumo
    100% cacao puro" (sin cambios).
