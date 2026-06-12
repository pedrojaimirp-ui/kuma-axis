# KÚMA AXIS — Fase 1: Base + Autenticación + Tienda

## Contexto

KÚMA AXIS es una PWA de comercio en red para KÚMA ETERNA (chocolate de mesa 100% cacao,
bolsas de 250g), con un sistema de referidos de 4 niveles, moneda interna $KCA,
billetera con retiros por Nequi, y una ruleta de recompensas con giros diarios y por
referidos.

El proyecto completo se divide en 3 fases para mantener cada spec/plan manejable:

1. **Fase 1 (este documento):** estructura del proyecto, sistema de diseño, modelo de
   datos base en Supabase, registro/login, dashboard shell y módulo Tienda.
2. **Fase 2:** Red de Referidos + Billetera (cálculo y pago de comisiones).
3. **Fase 3:** Ruleta de Recompensas + Notificaciones.

Las reglas de negocio de comisiones, ruleta y niveles se documentan aquí solo en la
medida que afectan el modelo de datos de la Fase 1; su implementación es de fases
posteriores.

## Stack y estructura del proyecto

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (Postgres + Auth) vía `@supabase/supabase-js` y `@supabase/ssr`
- **Framer Motion** para animaciones (transiciones de página, tarjetas)
- **PWA**: `manifest.json`, íconos, service worker (vía `next-pwa` o equivalente) para
  instalación en celular, tablet y PC

Estructura de carpetas:

```
app/
  (auth)/
    login/
    register/
  (dashboard)/
    inicio/
    tienda/
    red/        (placeholder "Próximamente")
    billetera/  (placeholder "Próximamente")
    ruleta/     (placeholder "Próximamente")
  admin/
lib/
  supabase/
components/
types/
```

## Sistema de diseño — Paleta "Del Cacao a la Tableta"

Paleta extendida (opción A elegida), define variables Tailwind/CSS:

| Token | Hex | Origen |
|---|---|---|
| `cacao-mazorca` | `#7A9A3D` | Mazorca verde |
| `kuma-dorado` | `#C9A84C` | Dorado cosecha (marca) |
| `cacao-fresco` | `#8B5E34` | Grano fresco |
| `cacao-tostado` | `#5A3A22` | Grano tostado |
| `cacao-oscuro` | `#3B1A0A` | Cacao oscuro (marca) |
| `verde-natural` | `#1B4332` | Verde natural (marca) |
| `blanco-cacao` | `#FDF6EC` | Blanco cacao (marca) |
| `acento-digital` | `#00E5FF` | Acento digital (marca) |

Convenciones de uso:

- Header/nav y textos principales: `cacao-oscuro` sobre `blanco-cacao`
- CTAs y precios: `kuma-dorado`
- Estados "activo" / red de referidos: `verde-natural`
- $KCA, blockchain, elementos de ruleta: `acento-digital`
- Cada módulo (Tienda, Red, Billetera, Ruleta) usa un tono del recorrido del cacao
  (`cacao-mazorca`, `cacao-fresco`, `cacao-tostado`) como acento de sección para
  diferenciarse sutilmente sin romper la identidad de marca

## Modelo de datos (Supabase)

Estas tablas son la base para todo el proyecto (fases 2 y 3 las extienden), pero en
esta fase solo se implementa lo necesario para auth y tienda.

### `profiles`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK, = `auth.users.id` |
| `full_name` | text | |
| `phone` | text | único, formato colombiano (10 dígitos) |
| `referral_code` | text | único, autogenerado (6 caracteres alfanuméricos) |
| `referred_by` | uuid | FK → `profiles.id`, nullable |
| `role` | text | `'user'` \| `'admin'` \| `'owner'` |
| `terms_accepted_at` | timestamptz | |
| `created_at` | timestamptz | default now() |

- La cuenta `owner` es única, raíz del árbol (`referred_by = null`), con
  `referral_code` fijo/permanente sin expiración ni límite de usos. Queda exenta de
  cualquier requisito futuro (10 directos para KUMA3, recompra mensual, etc.).
- Se crea junto con el seed inicial de datos.

### `packages`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | `'kuma1'` \| `'kuma2'` \| `'kuma3'` |
| `name` | text | |
| `price` | numeric | |
| `bags` | int | |
| `commissions_json` | jsonb | comisiones L1-L4 |
| `daily_spins` | int | giros ruleta diarios |
| `referral_spins` | int | giros ganados por referido |
| `activation_requirement` | jsonb | nullable, ej. `{"min_direct_referrals": 10}` para kuma3 |

Datos semilla precargados con los 3 paquetes según la tabla de la spec original
(KUMA 1 $75.000/2 bolsas, KUMA 2 $170.000/4 bolsas, KUMA 3 $280.000/6 bolsas, con sus
comisiones por nivel y giros).

### `orders`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `profiles.id` |
| `package_id` | uuid | FK → `packages.id` |
| `shipping_address` | jsonb | calle, ciudad, departamento, teléfono de contacto |
| `auto_renew` | boolean | preferencia de recompra mensual automática (solo guardada, sin cobro automático en esta fase) |
| `status` | text | `'pending_payment'` \| `'paid'` \| `'rejected'` |
| `reviewed_by` | uuid | nullable, FK → `profiles.id` (admin que revisó) |
| `reviewed_at` | timestamptz | nullable |
| `created_at` | timestamptz | default now() |

### `platform_settings`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | int | PK, fila única (id=1) |
| `owner_commission_percent` | numeric | % global reservado para la cuenta `owner` en cada venta (usado en Fase 2) |

## Registro / Login

- **Registro**: nombre completo, celular (único), contraseña (con ojo de
  visibilidad), checkbox de aceptación de términos y condiciones (obligatorio).
- Internamente, Supabase Auth usa `email = "{celular}@kumaaxis.app"` — el usuario
  nunca ve ni introduce un email.
- Validaciones: celular formato colombiano (10 dígitos, único), contraseña mínimo 8
  caracteres, términos obligatorio.
- **Referidos**: si la URL de registro incluye `?ref=CODIGO`, se resuelve `CODIGO` a
  un `profile.id` y se guarda en `referred_by`. Si no hay código o es inválido, el
  usuario queda sin referente (no aplica para cuentas normales salvo la `owner`).
- Cada perfil nuevo genera su propio `referral_code` único para su link de
  invitación (`kumaaxis.app/r/CODIGO`).
- **Login**: celular + contraseña → se reconstruye el email sintético internamente
  para autenticar contra Supabase.

## Dashboard principal (shell)

- **Header**: logo KÚMA AXIS + saldo $KCA (placeholder `0.00`; billetera real es
  Fase 2)
- **Menú inferior**: Inicio, Tienda, Red, Billetera, Ruleta
  - Solo **Inicio** y **Tienda** son funcionales en esta fase
  - Red, Billetera y Ruleta muestran pantalla "Próximamente 🍫" con su ícono y el
    tono de acento de cacao correspondiente al módulo
- **Inicio**: bienvenida personalizada ("Hola, {nombre}"), tarjetas resumen (Saldo
  $KCA, Referidos activos, Giros disponibles) en placeholder/0 con indicación visual
  de "disponible próximamente"

## Tienda

- 3 tarjetas (KUMA 1/2/3) con precio, bolsas, comisiones por nivel y giros de ruleta,
  obtenidas de la tabla `packages`
- Botón "Comprar" abre formulario con:
  - Dirección de envío obligatoria (calle, ciudad, departamento, teléfono de
    contacto)
  - Checkbox "Recompra mensual automática" → guarda `auto_renew` (sin cobro
    automático real en esta fase)
- Al confirmar pedido:
  - Se muestra pantalla con instrucciones de pago por Nequi (número fijo
    configurable) y botón "Ya pagué"
  - Pulsar "Ya pagué" crea un registro en `orders` con `status = 'pending_payment'`
- **Mis pedidos**: listado simple de pedidos del usuario con su estado
  (`pending_payment` / `paid` / `rejected`)

## Panel Admin (básico)

- Ruta protegida `/admin`, accesible solo si `profiles.role` es `'admin'` u
  `'owner'`
- Lista de pedidos con `status = 'pending_payment'`, mostrando comprador, paquete y
  dirección de envío
- Botones "Marcar pagado" / "Rechazar" → actualizan `status`, `reviewed_by`,
  `reviewed_at`
- Asignación inicial de `role = 'admin'`/`'owner'` se hace manualmente en el
  dashboard de Supabase

## PWA

- `manifest.json` con nombre "KÚMA AXIS", íconos, colores de tema (`cacao-oscuro` /
  `blanco-cacao`)
- Instalable en PC, tablet y celular
- Shell básico funciona offline (sin datos dinámicos)

## Fuera de alcance (Fase 1)

- Cálculo y pago de comisiones por niveles (Fase 2)
- Árbol visual de referidos y notificaciones de nuevos referidos (Fase 2)
- Billetera, saldo $KCA real, retiros por Nequi (Fase 2)
- Ruleta de recompensas, giros, confeti, premios (Fase 3)
- Notificaciones push / Firebase Cloud Messaging (Fase 3)
- Cobro automático real de recompra mensual (requiere integración de pasarela)
- Verificación SMS del celular
- Integración con Binance Smart Chain / token $KCA on-chain
