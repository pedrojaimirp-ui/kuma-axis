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
