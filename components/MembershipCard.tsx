import type { MembershipTier, FounderBadgeStyle } from '@/lib/membership'

export function MembershipCard({
  fullName,
  tier,
  totalNetwork,
  referralCode,
  memberSince,
  qrDataUrl,
  founder,
}: {
  fullName: string
  tier: MembershipTier
  totalNetwork: number
  referralCode: string
  memberSince: string
  qrDataUrl: string
  founder?: { number: number; cap: number; style: FounderBadgeStyle }
}) {
  const borderStyle = founder
    ? { boxShadow: `0 0 0 1.5px ${founder.style.borderColor}` }
    : undefined

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-lg border border-kuma-dorado/30"
      style={borderStyle}
    >
      <img
        src="/cards/membership-bg.png"
        alt="Tarjeta de membresía KÚMA CACAO AXIS"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {founder && (
        <div
          className="absolute left-[6%] top-[6%] inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-black/40"
          style={{ boxShadow: `inset 0 0 0 1px ${founder.style.borderColor}` }}
        >
          <span className="text-[clamp(8px,1.8vw,11px)]">{founder.style.emoji}</span>
          <span
            className="text-[clamp(7px,1.5vw,10px)] font-bold tracking-wide"
            style={{ color: founder.style.borderColor }}
          >
            Fundador #{String(founder.number).padStart(3, '0')} / {founder.cap}
          </span>
        </div>
      )}

      <div className="absolute left-[6%] bottom-[7%] max-w-[55%]">
        <p className="text-[clamp(10px,2.6vw,15px)] font-extrabold text-blanco-cacao leading-tight truncate">
          {fullName}
        </p>
        <p className="text-[clamp(8px,1.7vw,11px)] font-bold text-kuma-dorado tracking-wide mt-0.5">
          {tier.emoji} {tier.label}
        </p>
        <p className="text-[clamp(6px,1.3vw,9px)] text-blanco-cacao/50 mt-1">
          Red total: {totalNetwork} personas
        </p>
      </div>

      <div className="absolute right-[6%] bottom-[7%] flex items-end gap-2">
        <div className="text-right">
          <p className="text-[clamp(6px,1.3vw,9px)] text-blanco-cacao/50">Código</p>
          <p className="text-[clamp(8px,1.8vw,12px)] font-bold text-kuma-dorado tracking-wide">
            {referralCode}
          </p>
        </div>
        <img
          src={qrDataUrl}
          alt="Código QR de invitación"
          className="h-[clamp(28px,9vw,52px)] w-[clamp(28px,9vw,52px)] rounded bg-blanco-cacao p-0.5"
        />
      </div>

      <p className="absolute left-1/2 -translate-x-1/2 bottom-[1.5%] text-[clamp(6px,1.2vw,8px)] text-blanco-cacao/40">
        Miembro desde {memberSince}
      </p>
    </div>
  )
}
