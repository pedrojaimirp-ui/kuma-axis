interface ReferralSlot {
  id: string
  full_name: string
}

export function ReferralSlotsGrid({
  totalSlots,
  referrals,
  unlimited,
}: {
  totalSlots: number
  referrals: ReferralSlot[]
  unlimited: boolean
}) {
  const slotCount = unlimited ? referrals.length : totalSlots

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-cacao-oscuro">
        Tus invitados directos {unlimited ? '(ilimitado)' : `(${referrals.length}/${totalSlots})`}
      </h2>

      {slotCount > 0 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: slotCount }, (_, i) => {
            const referral = referrals[i]
            return (
              <div
                key={referral?.id ?? i}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 p-1 text-center text-xs font-semibold ${
                  referral
                    ? 'border-cacao-mazorca bg-cacao-mazorca/10 text-cacao-oscuro'
                    : 'border-dashed border-cacao-fresco/30 text-cacao-fresco/60'
                }`}
              >
                <span className="text-base">{referral ? '🍫' : i + 1}</span>
                {referral && <span className="mt-1 w-full truncate">{referral.full_name.split(' ')[0]}</span>}
              </div>
            )
          })}
        </div>
      )}

      {!unlimited && totalSlots === 0 && (
        <p className="mt-3 text-sm text-cacao-tostado">
          Compra un paquete en la Tienda para empezar a invitar personas a tu red.
        </p>
      )}

      {unlimited && referrals.length === 0 && (
        <p className="mt-3 text-sm text-cacao-tostado">Todavía no tienes invitados directos.</p>
      )}
    </div>
  )
}
