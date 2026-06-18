import type { Package } from '@/lib/types'

export function PublicPackageCard({ pkg, highlight = false }: { pkg: Package; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl overflow-hidden shadow-md border ${
      highlight
        ? 'border-kuma-dorado/50'
        : 'border-white/10'
    }`}>
      {highlight && (
        <div className="bg-kuma-dorado text-center py-1.5 text-[11px] font-extrabold text-cacao-oscuro tracking-wide">
          ⭐ MÁS POPULAR
        </div>
      )}
      <div className={`px-4 py-4 flex items-center justify-between ${
        highlight ? 'bg-gradient-to-r from-verde-natural to-[#1a4f35]' : 'bg-white/5'
      }`}>
        <div>
          <p className="text-xs font-bold text-blanco-cacao/50 uppercase tracking-wide mb-0.5">
            {pkg.bags} bolsas · {pkg.bags * 250}g de cacao puro
          </p>
          <h3 className="text-lg font-extrabold text-blanco-cacao">{pkg.name}</h3>
          <p className="text-2xl font-extrabold text-kuma-dorado">
            ${Number(pkg.price).toLocaleString('es-CO')}
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="rounded-xl bg-white/10 px-3 py-1 text-center">
            <p className="text-[10px] text-blanco-cacao/50">Giros/día</p>
            <p className="font-extrabold text-kuma-dorado text-lg leading-none">{pkg.daily_spins}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
