# KÚMA AXIS — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the KÚMA AXIS PWA base: Next.js 14 + Tailwind + Supabase project scaffold, the "Del Cacao a la Tableta" design system, the core data model (profiles, packages, orders, platform_settings), phone-based registration/login with referral-code capture, a dashboard shell with bottom nav, the Tienda module (catalog + manual-Nequi purchase flow + order history), a basic admin order-review panel, and PWA installability.

**Architecture:** Next.js App Router with route groups `(auth)` and `(dashboard)`, Supabase for Postgres + Auth (phone mapped to a synthetic email), RLS-enforced data access via `@supabase/ssr` server/browser clients, server actions for writes (order creation, admin review). Pure logic (phone validation, referral codes, password rules) lives in `lib/` with Vitest unit tests; UI correctness is verified by running the dev server.

**Tech Stack:** Next.js 14 (App Router, TS), Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Framer Motion (installed, used from Fase 2+), Vitest.

---

## Task 1: Project scaffold (Next.js + TypeScript + Tailwind)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.js`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "kuma-axis",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.4.0",
    "framer-motion": "^11.3.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.5",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 4: Write `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
```

- [ ] **Step 5: Write `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Write `tailwind.config.ts` (minimal — palette added in Task 2)**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Step 7: Write `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  color: #3b1a0a;
}
```

- [ ] **Step 8: Write `app/layout.tsx`**

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 9: Write `app/page.tsx`**

```tsx
export default function Home() {
  return <main className="p-8">KÚMA AXIS</main>
}
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `node_modules/` and `package-lock.json`

- [ ] **Step 11: Verify the project builds**

Run: `npm run build`
Expected: `Compiled successfully`, no type errors

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts next.config.js postcss.config.js tailwind.config.ts app
git commit -m "Scaffold Next.js 14 + TypeScript + Tailwind project"
```

---

## Task 2: Design system — "Del Cacao a la Tableta" palette

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the cacao palette tokens to `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'cacao-mazorca': '#7A9A3D',
        'kuma-dorado': '#C9A84C',
        'cacao-fresco': '#8B5E34',
        'cacao-tostado': '#5A3A22',
        'cacao-oscuro': '#3B1A0A',
        'verde-natural': '#1B4332',
        'blanco-cacao': '#FDF6EC',
        'acento-digital': '#00E5FF',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Update `app/page.tsx` to a palette swatch smoke test**

```tsx
const SWATCHES = [
  { name: 'cacao-mazorca', className: 'bg-cacao-mazorca' },
  { name: 'kuma-dorado', className: 'bg-kuma-dorado' },
  { name: 'cacao-fresco', className: 'bg-cacao-fresco' },
  { name: 'cacao-tostado', className: 'bg-cacao-tostado' },
  { name: 'cacao-oscuro', className: 'bg-cacao-oscuro' },
  { name: 'verde-natural', className: 'bg-verde-natural' },
  { name: 'blanco-cacao', className: 'bg-blanco-cacao' },
  { name: 'acento-digital', className: 'bg-acento-digital' },
]

export default function Home() {
  return (
    <main className="grid grid-cols-2 gap-2 p-8 sm:grid-cols-4">
      {SWATCHES.map((swatch) => (
        <div key={swatch.name} className="space-y-1">
          <div className={`h-16 rounded-lg border ${swatch.className}`} />
          <p className="text-xs text-cacao-oscuro">{swatch.name}</p>
        </div>
      ))}
    </main>
  )
}
```

- [ ] **Step 3: Verify the palette renders**

Run: `npm run dev`
Open `http://localhost:3000` and confirm all 8 swatches render with the correct
colors (cacao-mazorca green, kuma-dorado gold, cacao-fresco/tostado/oscuro browns,
verde-natural green, blanco-cacao cream, acento-digital cyan). Stop the dev server
afterwards (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/page.tsx
git commit -m "Add Del Cacao a la Tableta color palette"
```

---

## Task 3: Supabase clients, shared types, env config

**Files:**
- Create: `.env.local.example`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/types.ts`

- [ ] **Step 1: Write `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 2: Write `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Write `lib/supabase/server.ts`**

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

- [ ] **Step 4: Write `lib/types.ts`**

```ts
export type PackageCode = 'kuma1' | 'kuma2' | 'kuma3'

export interface ActivationRequirement {
  min_direct_referrals: number
}

export interface Package {
  id: string
  code: PackageCode
  name: string
  price: number
  bags: number
  commissions_json: Record<string, number>
  daily_spins: number
  referral_spins: number
  activation_requirement: ActivationRequirement | null
}

export type ProfileRole = 'user' | 'admin' | 'owner'

export interface Profile {
  id: string
  full_name: string
  phone: string
  referral_code: string
  referred_by: string | null
  role: ProfileRole
  terms_accepted_at: string | null
  created_at: string
}

export type OrderStatus = 'pending_payment' | 'paid' | 'rejected'

export interface ShippingAddress {
  calle: string
  ciudad: string
  departamento: string
  telefono: string
}

export interface Order {
  id: string
  user_id: string
  package_id: string
  shipping_address: ShippingAddress
  auto_renew: boolean
  status: OrderStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminOrder {
  id: string
  created_at: string
  shipping_address: ShippingAddress
  profiles: { full_name: string; phone: string } | null
  packages: { name: string; price: number } | null
}
```

- [ ] **Step 5: Verify build still passes**

Run: `npm run build`
Expected: `Compiled successfully` (new files are not yet imported anywhere, but must
be valid TypeScript)

- [ ] **Step 6: Commit**

```bash
git add .env.local.example lib/supabase lib/types.ts
git commit -m "Add Supabase client helpers and shared types"
```

---

## Task 4: Database schema (Supabase SQL migration)

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write `supabase/migrations/0001_init.sql`**

```sql
-- profiles --------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null unique,
  referral_code text not null unique,
  referred_by uuid references public.profiles (id),
  role text not null default 'user' check (role in ('user', 'admin', 'owner')),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'owner')
    )
  );

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- auto-create profile row on signup -------------------------------------
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, referral_code, referred_by, terms_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'referral_code',
    (new.raw_user_meta_data->>'referred_by')::uuid,
    now()
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- resolve a referral code to a profile id, callable by anon --------------
create function public.resolve_referral_code(code text)
returns uuid as $$
  select id from public.profiles where referral_code = code;
$$ language sql security definer stable set search_path = public;

grant execute on function public.resolve_referral_code(text) to anon, authenticated;

-- packages ----------------------------------------------------------------
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price numeric not null,
  bags int not null,
  commissions_json jsonb not null,
  daily_spins int not null,
  referral_spins int not null,
  activation_requirement jsonb
);

alter table public.packages enable row level security;

create policy "packages_select_all" on public.packages
  for select using (true);

insert into public.packages (code, name, price, bags, commissions_json, daily_spins, referral_spins, activation_requirement)
values
  ('kuma1', 'KUMA 1', 75000, 2, '{"L1": 5000, "L2": 2000, "L3": 3500, "L4": 1000}', 1, 1, null),
  ('kuma2', 'KUMA 2', 170000, 4, '{"L1": 12000, "L2": 3000, "L3": 4500, "L4": 1000}', 2, 1, null),
  ('kuma3', 'KUMA 3', 280000, 6, '{"L1": 20000, "L2": 5000, "L3": 7000, "L4": 2000}', 3, 1, '{"min_direct_referrals": 10}');

-- orders --------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  package_id uuid not null references public.packages (id),
  shipping_address jsonb not null,
  auto_renew boolean not null default false,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own_or_admin" on public.orders
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'owner')
    )
  );

create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());

create policy "orders_update_admin" on public.orders
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'owner')
    )
  );

-- platform settings -----------------------------------------------------
create table public.platform_settings (
  id int primary key default 1,
  owner_commission_percent numeric not null default 5,
  constraint platform_settings_single_row check (id = 1)
);

alter table public.platform_settings enable row level security;

create policy "platform_settings_select_admin" on public.platform_settings
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'owner')
    )
  );

insert into public.platform_settings (id, owner_commission_percent) values (1, 5);
```

- [ ] **Step 2: Run the migration in Supabase**

In the Supabase project's SQL Editor, paste and run the full contents of
`supabase/migrations/0001_init.sql`.
Expected: all statements succeed, and `select * from public.packages;` returns the
3 seeded rows (kuma1, kuma2, kuma3).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "Add Supabase schema: profiles, packages, orders, platform_settings"
```

---

## Task 5: Core utility functions (phone, referral code, password) with tests

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/phone.ts`
- Create: `lib/referral.ts`
- Create: `lib/validation.ts`
- Test: `lib/phone.test.ts`
- Test: `lib/referral.test.ts`
- Test: `lib/validation.test.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 2: Write failing tests for phone helpers**

`lib/phone.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isValidColombianPhone, toSyntheticEmail } from './phone'

describe('isValidColombianPhone', () => {
  it('accepts valid 10-digit numbers starting with 3', () => {
    expect(isValidColombianPhone('3001234567')).toBe(true)
  })

  it('rejects numbers not starting with 3', () => {
    expect(isValidColombianPhone('2001234567')).toBe(false)
  })

  it('rejects numbers with the wrong length', () => {
    expect(isValidColombianPhone('300123456')).toBe(false)
    expect(isValidColombianPhone('30012345678')).toBe(false)
  })

  it('rejects non-numeric input', () => {
    expect(isValidColombianPhone('300123456a')).toBe(false)
  })
})

describe('toSyntheticEmail', () => {
  it('builds the kumaaxis.app synthetic email from a phone number', () => {
    expect(toSyntheticEmail('3001234567')).toBe('3001234567@kumaaxis.app')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run lib/phone.test.ts`
Expected: FAIL — `Cannot find module './phone'` (file does not exist yet)

- [ ] **Step 4: Implement `lib/phone.ts`**

```ts
export function isValidColombianPhone(phone: string): boolean {
  return /^3\d{9}$/.test(phone)
}

export function toSyntheticEmail(phone: string): string {
  return `${phone}@kumaaxis.app`
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/phone.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Write failing tests for the referral code generator**

`lib/referral.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateReferralCode } from './referral'

describe('generateReferralCode', () => {
  it('returns a 6-character code', () => {
    expect(generateReferralCode()).toHaveLength(6)
  })

  it('only uses unambiguous uppercase letters and digits', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('generates different codes across calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferralCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npx vitest run lib/referral.test.ts`
Expected: FAIL — `Cannot find module './referral'`

- [ ] **Step 8: Implement `lib/referral.ts`**

```ts
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run lib/referral.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 10: Write failing tests for password validation**

`lib/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isValidPassword } from './validation'

describe('isValidPassword', () => {
  it('accepts passwords with 8 or more characters', () => {
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('a-much-longer-password')).toBe(true)
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('')).toBe(false)
  })
})
```

- [ ] **Step 11: Run the tests to verify they fail**

Run: `npx vitest run lib/validation.test.ts`
Expected: FAIL — `Cannot find module './validation'`

- [ ] **Step 12: Implement `lib/validation.ts`**

```ts
export function isValidPassword(password: string): boolean {
  return password.length >= 8
}
```

- [ ] **Step 13: Run the full test suite**

Run: `npm test`
Expected: PASS (11 tests across 3 files)

- [ ] **Step 14: Commit**

```bash
git add vitest.config.ts lib/phone.ts lib/phone.test.ts lib/referral.ts lib/referral.test.ts lib/validation.ts lib/validation.test.ts
git commit -m "Add phone, referral code, and password validation utilities with tests"
```

---

## Task 6: Registration page

**Files:**
- Create: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Write `app/(auth)/register/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isValidColombianPhone, toSyntheticEmail } from '@/lib/phone'
import { isValidPassword } from '@/lib/validation'
import { generateReferralCode } from '@/lib/referral'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidColombianPhone(phone)) {
      setError('Ingresa un celular colombiano válido (10 dígitos, inicia en 3).')
      return
    }
    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    let referredBy: string | null = null
    if (refCode) {
      const { data } = await supabase.rpc('resolve_referral_code', { code: refCode })
      referredBy = (data as string | null) ?? null
    }

    let signUpError: { message: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const referralCode = generateReferralCode()
      const { error: err } = await supabase.auth.signUp({
        email: toSyntheticEmail(phone),
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            referral_code: referralCode,
            referred_by: referredBy,
          },
        },
      })

      if (!err) {
        signUpError = null
        break
      }

      signUpError = err
      if (!err.message.includes('referral_code')) break
    }

    setLoading(false)

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes('already registered')
          ? 'Este celular ya está registrado.'
          : 'No se pudo crear la cuenta. Intenta de nuevo.'
      )
      return
    }

    router.push('/inicio')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blanco-cacao px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-cacao-oscuro">
          Crear cuenta — KÚMA AXIS
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Nombre completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Celular</label>
            <input
              type="tel"
              required
              placeholder="3001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Contraseña</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 pr-10 focus:border-kuma-dorado focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-cacao-tostado"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-cacao-tostado">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
            />
            Acepto los términos y condiciones de KÚMA AXIS.
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-cacao-tostado">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-verde-natural">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Add the Supabase project URL and anon key to `.env.local` (copy from
`.env.local.example`). Run: `npm run dev`, open `http://localhost:3000/register`.
Expected: the registration form renders with the name, phone, password (with
eye toggle), and terms checkbox fields. Confirm the eye icon toggles password
visibility. Stop the dev server afterwards (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/register
git commit -m "Add registration page with phone-based signup and referral capture"
```

---

## Task 7: Login page

**Files:**
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Write `app/(auth)/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isValidColombianPhone, toSyntheticEmail } from '@/lib/phone'

export default function LoginPage() {
  const router = useRouter()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidColombianPhone(phone)) {
      setError('Ingresa un celular colombiano válido (10 dígitos, inicia en 3).')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: toSyntheticEmail(phone),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError('Celular o contraseña incorrectos.')
      return
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blanco-cacao px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-cacao-oscuro">
          Iniciar sesión — KÚMA AXIS
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Celular</label>
            <input
              type="tel"
              required
              placeholder="3001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Contraseña</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 pr-10 focus:border-kuma-dorado focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-cacao-tostado"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-cacao-tostado">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-semibold text-verde-natural">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify login works end-to-end**

Run: `npm run dev`. Register a new account at `/register`, then log out (no logout
button yet — clear cookies via browser dev tools), and log back in at `/login`
using the same phone/password. Expected: successful login redirects toward
`/inicio` (page does not exist yet — a 404 is expected at this point; the redirect
itself is what's being verified). Stop the dev server afterwards (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/login
git commit -m "Add login page for phone-based authentication"
```

---

## Task 8: Route protection middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write `middleware.ts`**

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/inicio', '/tienda', '/red', '/billetera', '/ruleta', '/admin']
const AUTH_PREFIXES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))
  const isAuthPage = AUTH_PREFIXES.some((prefix) => path.startsWith(prefix))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/inicio', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
}
```

- [ ] **Step 2: Write `app/page.tsx` to redirect based on auth state**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/inicio' : '/login')
}
```

- [ ] **Step 3: Verify redirects**

Run: `npm run dev`. Visit `http://localhost:3000/` while logged out → redirected to
`/login`. Visit `http://localhost:3000/tienda` while logged out → redirected to
`/login`. Log in, then visit `/login` again → redirected to `/inicio` (404 expected
until Task 9, but the redirect target confirms the middleware works). Stop the dev
server afterwards (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add middleware.ts app/page.tsx
git commit -m "Add auth-based route protection middleware"
```

---

## Task 9: Dashboard shell — layout, header, bottom nav

**Files:**
- Create: `components/Header.tsx`
- Create: `components/BottomNav.tsx`
- Create: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Write `components/Header.tsx`**

```tsx
export function Header({ fullName }: { fullName: string }) {
  return (
    <header className="flex items-center justify-between bg-cacao-oscuro px-4 py-3 text-blanco-cacao">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍫</span>
        <span className="text-lg font-bold text-kuma-dorado">KÚMA AXIS</span>
      </div>
      <div className="text-right">
        <p className="text-xs text-blanco-cacao/70">{fullName}</p>
        <p className="font-semibold text-acento-digital">0.00 $KCA</p>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Write `components/BottomNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/inicio', label: 'Inicio', icon: '🏠' },
  { href: '/tienda', label: 'Tienda', icon: '🛒' },
  { href: '/red', label: 'Red', icon: '🌳' },
  { href: '/billetera', label: 'Billetera', icon: '👛' },
  { href: '/ruleta', label: 'Ruleta', icon: '🎰' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-cacao-fresco/20 bg-white">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              active ? 'font-semibold text-kuma-dorado' : 'text-cacao-tostado'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: Write `app/(dashboard)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-blanco-cacao pb-16">
      <Header fullName={profile?.full_name ?? ''} />
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: `Compiled successfully` (no routes under `(dashboard)` exist yet, so this
just validates the layout/components compile)

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/BottomNav.tsx app/\(dashboard\)/layout.tsx
git commit -m "Add dashboard shell with header and bottom navigation"
```

---

## Task 10: Inicio page

**Files:**
- Create: `app/(dashboard)/inicio/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/inicio/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ACCENT_BORDER: Record<string, string> = {
  digital: 'border-acento-digital',
  verde: 'border-verde-natural',
  mazorca: 'border-cacao-mazorca',
}

function SummaryCard({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: string
  note: string
  accent: keyof typeof ACCENT_BORDER
}) {
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${ACCENT_BORDER[accent]}`}>
      <p className="text-sm text-cacao-tostado">{label}</p>
      <p className="text-2xl font-bold text-cacao-oscuro">{value}</p>
      <p className="text-xs text-cacao-fresco">{note}</p>
    </div>
  )
}

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Hola, {firstName} 👋</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Saldo $KCA" value="0.00" note="Disponible próximamente" accent="digital" />
        <SummaryCard label="Referidos activos" value="0" note="Disponible próximamente" accent="verde" />
        <SummaryCard label="Giros disponibles" value="0" note="Disponible próximamente" accent="mazorca" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev`. Log in and confirm `/inicio` shows "Hola, {tu nombre}" and the
three summary cards with colored left borders (cyan, green, olive). Confirm the
header shows "0.00 $KCA" and the bottom nav highlights "Inicio". Stop the dev
server afterwards (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/inicio
git commit -m "Add Inicio dashboard page with summary cards"
```

---

## Task 11: Placeholder pages — Red, Billetera, Ruleta

**Files:**
- Create: `components/ComingSoon.tsx`
- Create: `app/(dashboard)/red/page.tsx`
- Create: `app/(dashboard)/billetera/page.tsx`
- Create: `app/(dashboard)/ruleta/page.tsx`

- [ ] **Step 1: Write `components/ComingSoon.tsx`**

```tsx
export function ComingSoon({
  title,
  emoji,
  accentClass,
}: {
  title: string
  emoji: string
  accentClass: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center ${accentClass}`}>
      <span className="text-4xl">{emoji}</span>
      <h2 className="mt-2 text-lg font-bold text-cacao-oscuro">{title}</h2>
      <p className="mt-1 text-cacao-tostado">Próximamente 🍫</p>
    </div>
  )
}
```

- [ ] **Step 2: Write `app/(dashboard)/red/page.tsx`**

```tsx
import { ComingSoon } from '@/components/ComingSoon'

export default function RedPage() {
  return <ComingSoon title="Red de Referidos" emoji="🌳" accentClass="border-cacao-fresco" />
}
```

- [ ] **Step 3: Write `app/(dashboard)/billetera/page.tsx`**

```tsx
import { ComingSoon } from '@/components/ComingSoon'

export default function BilleteraPage() {
  return <ComingSoon title="Billetera" emoji="👛" accentClass="border-cacao-tostado" />
}
```

- [ ] **Step 4: Write `app/(dashboard)/ruleta/page.tsx`**

```tsx
import { ComingSoon } from '@/components/ComingSoon'

export default function RuletaPage() {
  return <ComingSoon title="Ruleta de Recompensas" emoji="🎰" accentClass="border-acento-digital" />
}
```

- [ ] **Step 5: Verify the pages render**

Run: `npm run dev`. Click "Red", "Billetera", and "Ruleta" in the bottom nav.
Expected: each shows a dashed-border "Próximamente 🍫" card with its emoji and a
section-specific accent color (olive/brown for Red, dark brown for Billetera, cyan
for Ruleta). Stop the dev server afterwards (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add components/ComingSoon.tsx app/\(dashboard\)/red app/\(dashboard\)/billetera app/\(dashboard\)/ruleta
git commit -m "Add Proximamente placeholders for Red, Billetera, and Ruleta"
```

---

## Task 12: Tienda — package catalog

**Files:**
- Create: `components/PackageCard.tsx`
- Create: `app/(dashboard)/tienda/page.tsx`

- [ ] **Step 1: Write `components/PackageCard.tsx`**

```tsx
import Link from 'next/link'
import type { Package } from '@/lib/types'

const LEVEL_LABELS: Record<string, string> = {
  L1: 'Nivel 1',
  L2: 'Nivel 2',
  L3: 'Nivel 3',
  L4: 'Nivel 4',
}

export function PackageCard({ pkg }: { pkg: Package }) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold text-cacao-oscuro">{pkg.name}</h3>
      <p className="text-2xl font-bold text-kuma-dorado">${pkg.price.toLocaleString('es-CO')}</p>
      <p className="text-sm text-cacao-tostado">{pkg.bags} bolsas de 250g</p>

      <div className="mt-3 space-y-1 text-sm text-cacao-tostado">
        <p className="font-semibold text-cacao-oscuro">Comisiones por nivel:</p>
        {Object.entries(pkg.commissions_json).map(([level, value]) => (
          <p key={level}>
            {LEVEL_LABELS[level] ?? level}: ${Number(value).toLocaleString('es-CO')}
          </p>
        ))}
      </div>

      <p className="mt-3 text-sm text-verde-natural">
        🎰 {pkg.daily_spins} giro(s) diario(s) + {pkg.referral_spins} por referido
      </p>

      {pkg.activation_requirement?.min_direct_referrals && (
        <p className="mt-1 text-xs text-cacao-fresco">
          Requiere {pkg.activation_requirement.min_direct_referrals} invitados directos para activarse.
        </p>
      )}

      <Link
        href={`/tienda/comprar/${pkg.code}`}
        className="mt-4 rounded-lg bg-kuma-dorado py-2 text-center font-semibold text-cacao-oscuro hover:opacity-90"
      >
        Comprar
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Write `app/(dashboard)/tienda/page.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PackageCard } from '@/components/PackageCard'
import type { Package } from '@/lib/types'

export default async function TiendaPage() {
  const supabase = createClient()
  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-cacao-oscuro">Tienda</h1>
        <Link href="/tienda/pedidos" className="text-sm font-semibold text-verde-natural">
          Mis pedidos
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(packages as Package[] | null)?.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the catalog renders**

Run: `npm run dev`. Visit `/tienda`. Expected: 3 cards (KUMA 1, 2, 3) with correct
prices ($75.000, $170.000, $280.000), bag counts, per-level commissions, spin
counts, and KUMA 3 shows the "10 invitados directos" note. Each card has a
"Comprar" button. Stop the dev server afterwards (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add components/PackageCard.tsx app/\(dashboard\)/tienda/page.tsx
git commit -m "Add Tienda package catalog"
```

---

## Task 13: Tienda — purchase flow (shipping address + manual Nequi payment)

**Files:**
- Create: `lib/actions/orders.ts`
- Create: `components/PurchaseForm.tsx`
- Create: `app/(dashboard)/tienda/comprar/[code]/page.tsx`

- [ ] **Step 1: Write `lib/actions/orders.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { ShippingAddress } from '@/lib/types'

export async function createOrder(input: {
  packageId: string
  shippingAddress: ShippingAddress
  autoRenew: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('orders').insert({
    user_id: user.id,
    package_id: input.packageId,
    shipping_address: input.shippingAddress,
    auto_renew: input.autoRenew,
    status: 'pending_payment',
  })

  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Write `components/PurchaseForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder } from '@/lib/actions/orders'
import type { Package, ShippingAddress } from '@/lib/types'

const NEQUI_NUMBER = '300 000 0000'

export function PurchaseForm({ pkg }: { pkg: Package }) {
  const router = useRouter()
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [address, setAddress] = useState<ShippingAddress>({
    calle: '',
    ciudad: '',
    departamento: '',
    telefono: '',
  })
  const [autoRenew, setAutoRenew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleAddressSubmit(e: FormEvent) {
    e.preventDefault()
    if (!address.calle || !address.ciudad || !address.departamento || !address.telefono) {
      setError('Completa todos los campos de la dirección.')
      return
    }
    setError(null)
    setStep('payment')
  }

  async function handleConfirmPayment() {
    setLoading(true)
    setError(null)
    try {
      await createOrder({ packageId: pkg.id, shippingAddress: address, autoRenew })
      router.push('/tienda/pedidos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pedido.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'payment') {
    return (
      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-cacao-oscuro">Pagar {pkg.name}</h1>
        <p className="text-cacao-tostado">
          Transfiere{' '}
          <span className="font-bold text-kuma-dorado">${pkg.price.toLocaleString('es-CO')}</span> por
          Nequi al número:
        </p>
        <p className="text-2xl font-bold text-verde-natural">{NEQUI_NUMBER}</p>
        <p className="text-sm text-cacao-tostado">
          Cuando hayas hecho la transferencia, confirma tu pedido. Un administrador verificará
          el pago.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Ya pagué'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleAddressSubmit} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
      <h1 className="text-xl font-bold text-cacao-oscuro">Comprar {pkg.name}</h1>
      <p className="text-cacao-tostado">
        {pkg.bags} bolsas · ${pkg.price.toLocaleString('es-CO')}
      </p>

      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Calle / dirección</label>
        <input
          required
          value={address.calle}
          onChange={(e) => setAddress({ ...address, calle: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Ciudad</label>
        <input
          required
          value={address.ciudad}
          onChange={(e) => setAddress({ ...address, ciudad: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Departamento</label>
        <input
          required
          value={address.departamento}
          onChange={(e) => setAddress({ ...address, departamento: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Teléfono de contacto</label>
        <input
          required
          value={address.telefono}
          onChange={(e) => setAddress({ ...address, telefono: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-cacao-tostado">
        <input
          type="checkbox"
          checked={autoRenew}
          onChange={(e) => setAutoRenew(e.target.checked)}
        />
        Activar recompra mensual automática
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro hover:opacity-90"
      >
        Continuar al pago
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Write `app/(dashboard)/tienda/comprar/[code]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PurchaseForm } from '@/components/PurchaseForm'
import type { Package } from '@/lib/types'

export default async function ComprarPage({ params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: pkg } = await supabase
    .from('packages')
    .select('*')
    .eq('code', params.code)
    .single()

  if (!pkg) notFound()

  return <PurchaseForm pkg={pkg as Package} />
}
```

- [ ] **Step 4: Verify the purchase flow end-to-end**

Run: `npm run dev`. From `/tienda`, click "Comprar" on KUMA 1. Fill the shipping
address form and submit → expect the Nequi payment screen with the price and
phone number. Click "Ya pagué" → expect redirect to `/tienda/pedidos` (page does
not exist until Task 14; a 404 here is expected, but confirm in the Supabase
Table Editor that a new row appeared in `orders` with `status = 'pending_payment'`
and the correct `shipping_address`). Stop the dev server afterwards (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add lib/actions/orders.ts components/PurchaseForm.tsx app/\(dashboard\)/tienda/comprar
git commit -m "Add Tienda purchase flow with shipping address and manual Nequi payment"
```

---

## Task 14: Mis pedidos page

**Files:**
- Create: `app/(dashboard)/tienda/pedidos/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/tienda/pedidos/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'Pendiente de verificación', className: 'text-kuma-dorado' },
  paid: { label: 'Pagado', className: 'text-verde-natural' },
  rejected: { label: 'Rechazado', className: 'text-red-600' },
}

export default async function PedidosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, packages(name, price)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-cacao-oscuro">Mis pedidos</h1>
      {!orders?.length && <p className="text-cacao-tostado">Aún no tienes pedidos.</p>}
      {orders?.map((order) => {
        const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending_payment
        const pkg = order.packages as unknown as { name: string; price: number } | null
        return (
          <div key={order.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold text-cacao-oscuro">{pkg?.name}</p>
              <p className="text-sm text-cacao-tostado">
                ${pkg?.price?.toLocaleString('es-CO')} ·{' '}
                {new Date(order.created_at).toLocaleDateString('es-CO')}
              </p>
            </div>
            <span className={`text-sm font-semibold ${status.className}`}>{status.label}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify the order history renders**

Run: `npm run dev`. Visit `/tienda/pedidos`. Expected: the order created in Task 13
appears with the package name, price, date, and a gold "Pendiente de verificación"
label. Stop the dev server afterwards (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/tienda/pedidos
git commit -m "Add Mis pedidos order history page"
```

---

## Task 15: Admin panel — review pending orders

**Files:**
- Create: `lib/actions/admin.ts`
- Create: `components/AdminOrderRow.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Write `lib/actions/admin.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function reviewOrder(orderId: string, status: 'paid' | 'rejected') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('orders')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Write `components/AdminOrderRow.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { reviewOrder } from '@/lib/actions/admin'
import type { AdminOrder } from '@/lib/types'

export function AdminOrderRow({ order }: { order: AdminOrder }) {
  const [loading, setLoading] = useState<'paid' | 'rejected' | null>(null)
  const [done, setDone] = useState(false)

  async function handleReview(status: 'paid' | 'rejected') {
    setLoading(status)
    await reviewOrder(order.id, status)
    setLoading(null)
    setDone(true)
  }

  if (done) return null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-cacao-oscuro">
        {order.profiles?.full_name} · {order.profiles?.phone}
      </p>
      <p className="text-sm text-cacao-tostado">
        {order.packages?.name} · ${order.packages?.price.toLocaleString('es-CO')}
      </p>
      <p className="text-sm text-cacao-tostado">
        {order.shipping_address.calle}, {order.shipping_address.ciudad},{' '}
        {order.shipping_address.departamento} · Tel: {order.shipping_address.telefono}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => handleReview('paid')}
          disabled={loading !== null}
          className="rounded-lg bg-verde-natural px-3 py-1 text-sm font-semibold text-blanco-cacao disabled:opacity-50"
        >
          {loading === 'paid' ? 'Guardando...' : 'Marcar pagado'}
        </button>
        <button
          onClick={() => handleReview('rejected')}
          disabled={loading !== null}
          className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading === 'rejected' ? 'Guardando...' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `app/admin/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminOrderRow } from '@/components/AdminOrderRow'
import type { AdminOrder } from '@/lib/types'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    redirect('/inicio')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at, shipping_address, profiles(full_name, phone), packages(name, price)')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-blanco-cacao p-4">
      <h1 className="mb-4 text-xl font-bold text-cacao-oscuro">Pedidos pendientes</h1>
      <div className="space-y-3">
        {!orders?.length && <p className="text-cacao-tostado">No hay pedidos pendientes.</p>}
        {(orders as unknown as AdminOrder[] | null)?.map((order) => (
          <AdminOrderRow key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Promote your account to owner**

In the Supabase SQL Editor, find your user id (`select id, phone from public.profiles;`)
and run:

```sql
update public.profiles
set role = 'owner', referred_by = null
where id = '<your-profile-id>';
```

- [ ] **Step 5: Verify the admin panel works end-to-end**

Run: `npm run dev`. Log in as the `owner` account and visit `/admin`. Expected: the
pending order from Task 13 appears with buyer name/phone, package, price, and
shipping address. Click "Marcar pagado" → the row disappears. Re-check
`/tienda/pedidos` for that buyer and confirm the status now shows green "Pagado".
Log in as a non-admin user and visit `/admin` → expect redirect to `/inicio`. Stop
the dev server afterwards (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add lib/actions/admin.ts components/AdminOrderRow.tsx app/admin
git commit -m "Add admin panel for reviewing pending orders"
```

---

## Task 16: PWA — manifest, icon, service worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon.svg`
- Create: `public/sw.js`
- Create: `components/RegisterServiceWorker.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write `public/manifest.json`**

```json
{
  "name": "KÚMA AXIS",
  "short_name": "KÚMA AXIS",
  "description": "Comercio en red KÚMA ETERNA — chocolate 100% cacao",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FDF6EC",
  "theme_color": "#3B1A0A",
  "icons": [
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Write `public/icons/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#3B1A0A"/>
  <circle cx="256" cy="256" r="160" fill="#C9A84C"/>
  <text x="256" y="296" font-size="180" text-anchor="middle" fill="#3B1A0A" font-family="sans-serif" font-weight="bold">K</text>
</svg>
```

- [ ] **Step 3: Write `public/sw.js`**

```js
const CACHE_NAME = 'kuma-axis-v1'
const OFFLINE_URLS = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)))
})

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)))
})
```

- [ ] **Step 4: Write `components/RegisterServiceWorker.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return null
}
```

- [ ] **Step 5: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'
import './globals.css'

export const metadata: Metadata = {
  title: 'KÚMA AXIS',
  description: 'Comercio en red KÚMA ETERNA — chocolate 100% cacao',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Verify PWA installability**

Run: `npm run build && npm run start`. Open `http://localhost:3000` in Chrome,
open DevTools → Application → Manifest, and confirm the manifest loads with name
"KÚMA AXIS", the cacao-oscuro/dorado icon, and theme colors. Confirm the Service
Worker is registered and activated under Application → Service Workers. Stop the
server afterwards (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add public/manifest.json public/icons/icon.svg public/sw.js components/RegisterServiceWorker.tsx app/layout.tsx
git commit -m "Add PWA manifest, icon, and service worker registration"
```

---

## Self-Review Notes

- **Spec coverage:** stack/structure (Task 1), palette (Task 2), data model incl.
  owner/platform_settings (Tasks 3-4), registro/login with referral capture (Tasks
  5-7), dashboard shell + saldo placeholder + bottom nav (Tasks 9-11), Tienda
  catalog + compra + dirección obligatoria + recompra mensual flag + pago manual
  Nequi + mis pedidos (Tasks 12-14), panel admin (Task 15), PWA (Task 16). All
  Fase 1 spec sections are covered; Red/Billetera/Ruleta real functionality and
  notifications are explicitly out of scope per the spec's "Fuera de alcance".
- **Type consistency:** `Package`, `Profile`, `Order`, `ShippingAddress`,
  `AdminOrder` defined once in `lib/types.ts` (Task 3) and reused as-is in Tasks
  12-15 without renaming fields.
- **No placeholders:** the only literal placeholder is the Nequi number in
  `PurchaseForm.tsx` (`300 000 0000`), which is intentionally a configurable
  constant the project owner must replace with their real Nequi number — this is
  a real, expected manual configuration step, not a TODO.

