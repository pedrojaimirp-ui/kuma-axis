import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicPackageCard } from '@/components/PublicPackageCard'
import type { Package } from '@/lib/types'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/inicio')

  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  if (packagesError) console.error('packages select failed:', packagesError.message)

  return (
    <main className="flex min-h-screen flex-col items-center bg-cacao-oscuro px-4 py-0">
      <div className="w-full max-w-md">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden px-6 pt-14 pb-10 text-center">
          {/* Marca de agua grande */}
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[160px] opacity-[0.04] select-none pointer-events-none leading-none">
            🍫
          </span>

          {/* Logo / nombre */}
          <p className="text-xs font-bold tracking-[0.3em] text-kuma-dorado/70 uppercase mb-3">
            ✦ Chocolate colombiano ✦
          </p>
          <h1 className="text-5xl font-extrabold text-blanco-cacao leading-none tracking-tight">
            KÚMA
          </h1>
          <h2 className="text-lg font-extrabold text-kuma-dorado tracking-widest uppercase mt-1">
            CACAO AXIS
          </h2>
          <p className="mt-4 text-base font-semibold text-blanco-cacao/80 leading-snug">
            Con KÚMA gana<br />
            <span className="text-kuma-dorado font-extrabold text-xl">en cada paso que das</span>
          </p>
        </div>

        {/* ── GANCHO EMOCIONAL ── */}
        <div className="mx-4 rounded-2xl overflow-hidden shadow-xl mb-6">
          <div className="bg-gradient-to-br from-verde-natural to-[#1a4f35] px-5 py-5">
            <p className="text-base font-extrabold text-blanco-cacao leading-snug">
              ¿Cuándo fue la última vez que tomaste chocolate 100% cacao puro, sin azúcar ni conservantes?
            </p>
            <p className="mt-2 text-sm text-blanco-cacao/70 leading-relaxed">
              KÚMA te lo trae de vuelta. El chocolate que te despierta y te hace decir{' '}
              <span className="font-bold text-kuma-dorado">"esto sí es chocolate de verdad"</span>.
            </p>
          </div>
          <div className="bg-white/5 border-t border-white/10 px-5 py-3 flex justify-around text-center">
            {[
              { icon: '🌿', text: 'Sin azúcar' },
              { icon: '🚫', text: 'Sin rellenos' },
              { icon: '🇨🇴', text: '100% colombiano' },
            ].map(({ icon, text }) => (
              <div key={text}>
                <p className="text-lg">{icon}</p>
                <p className="text-[10px] font-semibold text-blanco-cacao/60">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAQUETES ── */}
        <div className="px-4 mb-2">
          <p className="text-xs font-extrabold tracking-widest text-kuma-dorado/70 uppercase mb-3">
            Elige tu paquete
          </p>
          <div className="space-y-3">
            {(packages as Package[] | null)?.map((pkg, i) => (
              <PublicPackageCard key={pkg.id} pkg={pkg} highlight={i === 1} />
            ))}
          </div>
        </div>

        {/* ── GANCHO DE RED ── */}
        <div className="mx-4 mt-5 rounded-2xl bg-gradient-to-br from-[#3b2007] to-cacao-oscuro border border-kuma-dorado/20 px-5 py-5 space-y-2">
          <p className="text-sm font-bold text-kuma-dorado">💰 ¿Y si además te pagan por recomendarlo?</p>
          <p className="text-sm text-blanco-cacao/70 leading-relaxed">
            Comparte KÚMA con tu círculo y gana comisiones reales por cada compra en tu red — hasta 4 niveles de profundidad.
          </p>
          <div className="grid grid-cols-4 gap-1 mt-3">
            {['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4'].map((n, i) => (
              <div key={n} className="rounded-lg bg-white/5 py-2 text-center">
                <p className="text-kuma-dorado font-extrabold text-sm">{i + 1}</p>
                <p className="text-[9px] text-blanco-cacao/50">{n}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RULETA ── */}
        <div className="mx-4 mt-4 rounded-2xl bg-kuma-dorado px-5 py-4 text-center shadow-lg">
          <p className="text-2xl mb-1">🎰</p>
          <p className="font-extrabold text-cacao-oscuro text-base leading-snug">
            Ruleta KÚMA diaria
          </p>
          <p className="text-xs text-cacao-oscuro/70 mt-1">
            Gira cada día y acumula Puntos KÚMA canjeables por chocolate, descuentos y premios exclusivos.
          </p>
        </div>

        {/* ── BOTONES ── */}
        <div className="px-4 mt-6 pb-10 space-y-3">
          <Link
            href="/register"
            className="block w-full rounded-2xl bg-kuma-dorado py-4 text-center font-extrabold text-cacao-oscuro text-base shadow-lg hover:opacity-90"
          >
            Quiero mi primer KÚMA 🍫
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-2xl border border-blanco-cacao/20 py-3.5 text-center font-semibold text-blanco-cacao/70 hover:bg-white/5 text-sm"
          >
            Ya tengo cuenta → Ingresar
          </Link>
          <p className="text-center text-[10px] text-blanco-cacao/30 pt-1">
            Registro gratis · Sin obligación de compra inmediata
          </p>
        </div>

      </div>
    </main>
  )
}
