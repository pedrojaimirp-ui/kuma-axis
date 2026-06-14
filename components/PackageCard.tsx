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
      <p className="text-2xl font-bold text-kuma-dorado">${Number(pkg.price).toLocaleString('es-CO')}</p>
      <p className="text-sm text-cacao-tostado">
        {pkg.bags} bolsas de 250 g · Chocolate 100% cacao sin azúcar ni conservantes
      </p>

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

      {pkg.max_direct_referrals && (
        <p className="mt-1 text-xs text-cacao-fresco">
          Puedes invitar hasta {pkg.max_direct_referrals} personas directas con este paquete.
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
