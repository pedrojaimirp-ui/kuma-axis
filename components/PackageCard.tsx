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
    <div className="flex flex-col rounded-2xl overflow-hidden shadow-md border border-cacao-fresco/10">
      {/* Encabezado */}
      <div className="bg-cacao-oscuro px-4 pt-4 pb-3">
        <h3 className="text-lg font-extrabold text-kuma-dorado">🍫 {pkg.name}</h3>
        <p className="text-3xl font-extrabold text-blanco-cacao">${Number(pkg.price).toLocaleString('es-CO')}</p>
        <p className="text-xs text-blanco-cacao/60 mt-1">
          {pkg.bags} bolsas de 250 g · 100% cacao puro
        </p>
      </div>

      {/* Cuerpo */}
      <div className="bg-white flex flex-col flex-1 p-4 space-y-3">
        <div className="rounded-xl bg-blanco-cacao p-3 space-y-1">
          <p className="text-xs font-bold text-cacao-oscuro uppercase tracking-wide">Puntos KÚMA por nivel:</p>
          {Object.entries(pkg.commissions_json).map(([level, value]) => (
            <div key={level} className="flex justify-between text-sm">
              <span className="text-cacao-tostado">{LEVEL_LABELS[level] ?? level}</span>
              <span className="font-bold text-verde-natural">${Number(value).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-kuma-dorado/20 px-3 py-1 text-cacao-oscuro font-semibold">
            🎰 {pkg.daily_spins} giro{pkg.daily_spins !== 1 ? 's' : ''}/día
          </span>
          <span className="rounded-full bg-verde-natural/20 px-3 py-1 text-cacao-oscuro font-semibold">
            👥 {pkg.max_direct_referrals} invitados
          </span>
        </div>

        <Link
          href={`/tienda/comprar/${pkg.code}`}
          className="mt-auto rounded-xl bg-kuma-dorado py-3 text-center font-extrabold text-cacao-oscuro hover:opacity-90 shadow-sm"
        >
          Comprar ahora →
        </Link>
      </div>
    </div>
  )
}
