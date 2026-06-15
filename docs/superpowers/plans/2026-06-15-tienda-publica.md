# Tienda Pública (Pieza 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` a public landing page that shows the KÚMA packages and lets a visitor without a session create an account and buy, without any "join the network" framing; and make `/register` show neutral "create your account to buy chocolate" copy when there's no `?ref=` code.

**Architecture:** `app/page.tsx` becomes conditional: with a session it keeps `redirect('/inicio')`; without a session it renders a new public landing (server component) that reads `public.packages` (already publicly readable via RLS) and renders a new read-only `PublicPackageCard` component (no "Comprar" button, no commission/network wording). `app/(auth)/register/page.tsx` gets a small conditional on the existing `refCode` variable to pick between two header copy variants. No middleware, database, or auth-logic changes.

**Tech Stack:** Next.js 14 App Router (server components), TypeScript, Tailwind CSS, Supabase JS client (`@/lib/supabase/server`), existing `Package` type from `@/lib/types`.

---

## File Structure

- **Create:** `components/PublicPackageCard.tsx` — read-only card for the public landing (name, bags, price only; no commissions, no spins, no "Comprar" button, no `/tienda/comprar/...` link).
- **Modify:** `app/page.tsx` — replace the unconditional redirect with the conditional landing/redirect logic described above.
- **Modify:** `app/(auth)/register/page.tsx` — replace the static header subtitle with a conditional based on `refCode`.

No test files are created: this project's automated tests (`npm test` via Vitest) cover pure `lib/` utility functions only — there is no component/page testing harness. Correctness for these UI changes is verified via `npm run build` (compiles all routes, including the new `/` branch) and the manual checklist in Task 4, per the spec's Testing section.

---

### Task 1: `PublicPackageCard` component

**Files:**
- Create: `components/PublicPackageCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { Package } from '@/lib/types'

export function PublicPackageCard({ pkg }: { pkg: Package }) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold text-cacao-oscuro">{pkg.name}</h3>
      <p className="text-2xl font-bold text-kuma-dorado">${Number(pkg.price).toLocaleString('es-CO')}</p>
      <p className="text-sm text-cacao-tostado">
        {pkg.bags} bolsas de 250 g · Chocolate 100% cacao sin azúcar ni conservantes
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (this file is not yet imported anywhere, so it won't fail the build even if unused — but it must type-check cleanly once Task 2 imports it; this step just confirms no syntax/type errors in isolation by re-running the build after Task 2).

This step has no independent check yet — fold the verification into Task 2's build step. Proceed directly to Task 2.

- [ ] **Step 3: Commit**

```bash
git add components/PublicPackageCard.tsx
git commit -m "feat: add read-only PublicPackageCard for tienda publica"
```

---

### Task 2: Public landing on `/`

**Files:**
- Modify: `app/page.tsx`

Current content (9 lines):

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/inicio' : '/login')
}
```

- [ ] **Step 1: Replace `app/page.tsx` with the conditional landing**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicPackageCard } from '@/components/PublicPackageCard'
import type { Package } from '@/lib/types'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/inicio')
  }

  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  if (packagesError) {
    console.error('packages select failed:', packagesError.message)
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-blanco-cacao px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-cacao-oscuro">KÚMA — Chocolate 100% cacao</h1>
          <p className="mt-2 text-sm text-cacao-tostado">
            Chocolate puro, sin aditivos, hecho con cacao real.
          </p>
        </div>

        <div className="space-y-4">
          {(packages as Package[] | null)?.map((pkg) => (
            <PublicPackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>

        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full rounded-lg bg-kuma-dorado py-2 text-center font-semibold text-cacao-oscuro hover:opacity-90"
          >
            Crear cuenta y comprar
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-lg border border-cacao-fresco/40 py-2 text-center font-semibold text-cacao-oscuro hover:bg-white"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="text-center text-xs text-cacao-fresco">
          Al crear tu cuenta podrás comprar chocolate KÚMA. Si más adelante quieres
          recomendar KÚMA a otras personas, podrás compartir tu propio enlace desde
          la sección &quot;Red&quot; de la app.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: all existing tests still pass (25/25 or more), same as before this change.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build succeeds and the route list includes `/` as a page (e.g. `○ /` in the output), with no type errors from `PublicPackageCard` or `Package`.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing publica en / para visitantes sin sesion"
```

---

### Task 3: Conditional header copy on `/register`

**Files:**
- Modify: `app/(auth)/register/page.tsx:102-105`

Current lines 99-105:

```tsx
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blanco-cacao px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-cacao-oscuro">KÚMA CACAO AXIS</h1>
        <p className="mb-6 text-center text-sm text-cacao-fresco">
          🍫 Red de consumo 100% cacao puro
        </p>
```

- [ ] **Step 1: Replace the static subtitle with a conditional based on `refCode`**

`refCode` is already defined at the top of `RegisterForm` (`app/(auth)/register/page.tsx:23`, `const refCode = searchParams.get('ref')`). Replace lines 102-105 with:

```tsx
        <h1 className="text-center text-2xl font-bold text-cacao-oscuro">KÚMA CACAO AXIS</h1>
        <p className="mb-6 text-center text-sm text-cacao-fresco">
          {refCode ? '🍫 Red de consumo 100% cacao puro' : '🍫 Crea tu cuenta para comprar chocolate 100% cacao'}
        </p>
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: all existing tests still pass (25/25 or more).

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build succeeds, `/register` route still present, no type errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/register/page.tsx"
git commit -m "feat: texto condicional en registro segun presencia de ref"
```

---

### Task 4: Manual verification

This task has no code changes — it confirms the feature works end-to-end in a real browser, per the spec's Testing section.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Visit `/` without a session (logged out / incognito)**

Expected: public landing renders with heading "KÚMA — Chocolate 100% cacao", the intro paragraph, one card per row of `public.packages` (KUMA 1/2/3) each showing name, bags, and price, a primary button "Crear cuenta y comprar" linking to `/register`, a secondary button "Ya tengo cuenta" linking to `/login`, and the footer note about creating an account / sharing a link later from "Red".

- [ ] **Step 3: Visit `/` with an active session**

Expected: redirects to `/inicio` exactly as before (unchanged behavior).

- [ ] **Step 4: Visit `/register` without `?ref=`**

Expected: subtitle reads "🍫 Crea tu cuenta para comprar chocolate 100% cacao". Registering still works and results in `referred_by = null` (unchanged existing behavior).

- [ ] **Step 5: Visit `/register?ref=<código válido de un usuario existente>`**

Expected: subtitle reads "🍫 Red de consumo 100% cacao puro" (unchanged from before this feature).

- [ ] **Step 6: Click "Crear cuenta y comprar" and "Ya tengo cuenta" from the `/` landing**

Expected: both navigate correctly to `/register` and `/login` respectively.

No commit for this task (verification only).

---

## Self-Review

**Spec coverage:**
- "1. Landing pública en `/`" → Task 2 (conditional redirect/landing, exact copy, package cards via `PublicPackageCard`, buttons to `/register` and `/login`).
- "2. Texto condicional en `/register`" → Task 3 (exact copy for both `refCode` branches).
- "3. Sin cambios de base de datos" → no task needed; nothing in this plan touches the DB, confirmed by Tasks 1-3 only touching `components/` and `app/`.
- Legal copy guidelines (avoid "red"/"comisión"/etc., exact text) → Task 2 uses only the approved copy ("Chocolate 100% cacao", "Crear cuenta y comprar", "Ya tengo cuenta", footer note mentioning "Red" only as an optional future feature, matching the spec's exact wording).
- Testing section → Task 2/3 Steps 2-3 (`npm test`, `npm run build`) and Task 4 (manual checklist matching the spec's four verification bullets).
- "Fuera de alcance" items (guest checkout, photo galleries, `/inicio`/`/red`/`/billetera` changes) → correctly excluded; no task touches those.

**Placeholder scan:** No TBD/TODO/"add appropriate" phrasing; all code blocks are complete and copy-pasteable.

**Type consistency:** `PublicPackageCard` (Task 1) takes `{ pkg: Package }` matching `PackageCard`'s existing signature; `Package` type (`lib/types.ts`) is imported the same way in Task 2 as in `app/(dashboard)/tienda/page.tsx`. `refCode` in Task 3 matches the existing declaration at `app/(auth)/register/page.tsx:23` — no renaming.
