import Link from 'next/link'
import { REWARD_CATALOG_BY_CODE } from '@/lib/constants'
import type { RewardVoucher } from '@/lib/types'

export function LoyaltyPointsCard({ points, vouchers }: { points: number; vouchers: RewardVoucher[] }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-cacao-tostado">Puntos KÚMA</p>
      <p className="text-3xl font-bold text-verde-natural">{points.toLocaleString('es-CO')} pts</p>

      <Link
        href="/billetera/canjear"
        className="mt-3 block w-full rounded-lg bg-verde-natural py-2 text-center font-semibold text-blanco-cacao hover:opacity-90"
      >
        Ver catálogo de premios
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
  )
}
