import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Package } from '@/lib/types'

const LEVEL_LABELS: Record<string, string> = {
  L1: 'Nivel 1 (tus invitados directos)',
  L2: 'Nivel 2',
  L3: 'Nivel 3',
  L4: 'Nivel 4',
}

export default async function PlanCompensacionPage() {
  const supabase = createClient()
  const { data: packages, error } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  if (error) {
    console.error('packages select failed:', error.message)
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-blanco-cacao px-4 py-10">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-cacao-oscuro">Plan de Compensación KÚMA</h1>
          <p className="text-sm text-cacao-tostado">
            Así de claro funciona: compras tu paquete de chocolate, comparte tu enlace, y ganas
            comisiones reales en hasta 4 niveles de profundidad de tu red.
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-cacao-tostado leading-relaxed">
            Cada vez que alguien de tu red compra un paquete KÚMA, una parte del precio se reparte
            como comisión entre quienes lo invitaron — hasta 4 niveles hacia arriba. Mientras más
            profundo crezca tu red, más oportunidades de ganar tienes.
          </p>
        </div>

        <div className="space-y-4">
          {(packages as Package[] | null)?.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="bg-cacao-oscuro px-4 py-3">
                <p className="text-kuma-dorado font-extrabold text-base">{pkg.name}</p>
                <p className="text-blanco-cacao/70 text-xs">
                  ${Number(pkg.price).toLocaleString('es-CO')} · {pkg.bags} bolsas de 250g de chocolate 100% cacao
                </p>
              </div>
              <div className="p-4 space-y-2">
                {Object.entries(pkg.commissions_json).map(([level, value]) => (
                  <div key={level} className="flex items-center justify-between rounded-lg bg-blanco-cacao px-3 py-2">
                    <span className="text-sm text-cacao-tostado">{LEVEL_LABELS[level] ?? level}</span>
                    <span className="text-sm font-extrabold text-verde-natural">
                      ${Number(value).toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-kuma-dorado/15 border border-kuma-dorado/30 p-4 text-center">
          <p className="text-sm text-cacao-oscuro">
            💬 ¿Tienes dudas? Comparte este enlace con quien quieras explicarle cómo funciona KÚMA:
          </p>
          <p className="mt-1 text-xs font-semibold text-cacao-tostado break-all">
            kumaaxis.com/plan-compensacion
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/register"
            className="block w-full rounded-lg bg-kuma-dorado py-3 text-center font-bold text-cacao-oscuro hover:opacity-90"
          >
            Quiero mi primer KÚMA 🍫
          </Link>
          <Link href="/" className="block w-full text-center text-sm text-verde-natural font-semibold">
            ← Volver al inicio
          </Link>
        </div>

      </div>
    </main>
  )
}
