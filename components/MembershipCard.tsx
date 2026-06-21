import type { MembershipTier } from '@/lib/membership'

export function MembershipCard({
  fullName,
  tier,
  totalNetwork,
  referralCode,
  memberSince,
  qrDataUrl,
}: {
  fullName: string
  tier: MembershipTier
  totalNetwork: number
  referralCode: string
  memberSince: string
  qrDataUrl: string
}) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-kuma-dorado/30 bg-gradient-to-br from-[#3b2007] to-cacao-oscuro p-5 relative">
      <span className="absolute -top-4 -right-4 text-8xl opacity-[0.06] select-none pointer-events-none">🍫</span>

      <p className="text-[10px] font-bold tracking-[0.25em] text-kuma-dorado uppercase">KÚMA CACAO AXIS</p>
      <p className="text-[10px] text-blanco-cacao/40 mb-4">Tarjeta de membresía oficial</p>

      <p className="text-lg font-extrabold text-blanco-cacao mb-2">{fullName}</p>

      <div className="inline-flex items-center gap-1.5 rounded-full bg-kuma-dorado/15 border border-kuma-dorado/50 px-3 py-1 mb-4">
        <span>{tier.emoji}</span>
        <span className="text-xs font-bold text-kuma-dorado">{tier.label}</span>
      </div>

      <div className="flex items-end justify-between border-t border-blanco-cacao/10 pt-3">
        <div className="flex gap-5">
          <div>
            <p className="text-[9px] text-blanco-cacao/40 uppercase tracking-wide">Red total</p>
            <p className="text-sm font-bold text-blanco-cacao">{totalNetwork} personas</p>
          </div>
          <div>
            <p className="text-[9px] text-blanco-cacao/40 uppercase tracking-wide">Código</p>
            <p className="text-sm font-bold text-blanco-cacao">{referralCode}</p>
          </div>
        </div>
        <img src={qrDataUrl} alt="Código QR de invitación" className="h-12 w-12 rounded-md bg-blanco-cacao p-1" />
      </div>

      <p className="text-center text-[9px] text-blanco-cacao/30 mt-3">Miembro desde {memberSince}</p>
    </div>
  )
}
