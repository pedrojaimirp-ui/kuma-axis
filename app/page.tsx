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
    <main className="flex min-h-screen flex-col items-center bg-[#e8f5e9] px-4 py-10">
      <div className="w-full max-w-md space-y-6">

        {/* Encabezado principal */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-cacao-oscuro leading-tight tracking-tight">
            KÚMA CACAO AXIS
          </h1>
          <p className="text-lg font-bold text-verde-natural">
            Con KÚMA gana en cada paso que das
          </p>
        </div>

        {/* Gancho del producto */}
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
          <p className="font-bold text-cacao-oscuro text-base">
            ¿Cuándo fue la última vez que tomaste una taza de chocolate 100% cacao puro, sin endulzantes ni saborizantes genéricos?
          </p>
          <p className="text-sm text-cacao-tostado">
            KÚMA te lo trae de vuelta. Sin azúcar, sin rellenos, sin cuento. El chocolate que te despierta y te hace decir <span className="font-semibold text-cacao-oscuro">"esto sí es chocolate de verdad"</span>.
          </p>
        </div>

        {/* Paquetes */}
        <div className="space-y-3">
          {(packages as Package[] | null)?.map((pkg) => (
            <PublicPackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>

        {/* Gancho de la red */}
        <div className="rounded-xl bg-cacao-oscuro p-4 shadow-sm space-y-2">
          <p className="text-sm text-blanco-cacao">
            Y si nos gusta tanto... <span className="font-bold text-kuma-dorado">¿por qué no recomendarlo?</span> ¿Sabías que puedes ganarte una platica recomendando a otros esa taza de chocolate que te tomas todos los días?
          </p>
          <p className="text-sm text-blanco-cacao">
            Además obtendrás descuentos y premios en <span className="font-bold text-kuma-dorado">Puntos KÚMA</span> canjeables por producto.
          </p>
        </div>

        {/* Ruleta */}
        <div className="rounded-xl bg-kuma-dorado p-4 shadow-sm text-center">
          <p className="font-bold text-cacao-oscuro">
            🎡 Con la Ruleta KÚMA todos los días ganamos — ¿y tú qué esperas para ser un ganador(a) más?
          </p>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full rounded-lg bg-kuma-dorado py-3 text-center font-bold text-cacao-oscuro hover:opacity-90 text-base"
          >
            Quiero mi primer KÚMA 🍫
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-lg border border-cacao-fresco/40 py-3 text-center font-semibold text-cacao-oscuro hover:bg-white"
          >
            Ya tengo cuenta
          </Link>
        </div>

      </div>
    </main>
  )
}
