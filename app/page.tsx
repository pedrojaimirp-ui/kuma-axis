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
