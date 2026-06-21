'use client'

export function ShareMembershipButton({
  tierLabel,
  referralLink,
}: {
  tierLabel: string
  referralLink: string
}) {
  function handleShare() {
    const mensaje =
      `¡Soy ${tierLabel}! 🍫\n\n` +
      `Únete a la red de chocolate 100% cacao puro que sí paga → ${referralLink}`
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  return (
    <button
      onClick={handleShare}
      className="w-full rounded-xl bg-[#25D366] py-3 font-extrabold text-white hover:opacity-90"
    >
      📲 Compartir mi tarjeta
    </button>
  )
}
