import Link from 'next/link'
import { REWARD_CATALOG_BY_CODE } from '@/lib/constants'
import type { RewardVoucher } from '@/lib/types'

export function LoyaltyPointsCard({ points, vouchers }: { points: number; vouchers: RewardVoucher[] }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      <div className="bg-verde-natural px-4 py-4">
        <p className="text-xs font-bold text-blanco-cacao/70 uppercase tracking-wide">Puntos KÚMA</p>
        <p className="text-4xl font-extrabold text-kuma-dorado">{points.toLocaleString('es-CO')}</p>
        <p className="text-xs text-blanco-cacao/60">puntos disponibles</p>
      </div>
      <div className="bg-white p-4">
      <Link
        href="/billetera/canjear"
        className="block w-full rounded-xl bg-kuma-dorado py-3 text-center font-extrabold text-cacao-oscuro hover:opacity-90"
      >
        🎁 Ver catálogo de premios
      </Link>

      {vouchers.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-cacao-oscuro">Tus cupones disponibles:</p>
          <ul className="mt-1 space-y-1 text-sm text-cacao-tostado">
            {vouchers.map((voucher) => (
              <li key={voucher.id}>
                •{' '}
                {REWARD_CATALOG_BY_CODE[voucher.source_reward_code as keyof typeof REWARD_CATALOG_BY_CODE]?.label
                  ?? `🎟️ $${voucher.discount_amount.toLocaleString('es-CO')} de descuento`}
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  )
}
