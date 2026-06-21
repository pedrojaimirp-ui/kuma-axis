'use client'

import { useState } from 'react'

export function ReferralLinkCard({ referralLink }: { referralLink: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('clipboard write failed:', err)
    }
  }

  function handleWhatsApp() {
    const mensaje =
      `¡Hola! 👋 Te invito a unirte a *KÚMA CACAO AXIS* — chocolate 100% cacao puro colombiano, sin azúcar ni conservantes, donde también puedes ganar comisiones por compartirlo.\n\n` +
      `Así te registras e instalas la app en tu celular:\n\n` +
      `1️⃣ Abre este enlace:\n${referralLink}\n\n` +
      `2️⃣ Toca "Registrarse" y llena tus datos (nombre, celular y contraseña)\n\n` +
      `3️⃣ Una vez dentro, toca el menú de tu navegador:\n` +
      `📱 En Chrome (Android): los 3 puntos (⋮) arriba a la derecha\n` +
      `🍎 En Safari (iPhone): el botón de compartir (□↑) abajo\n\n` +
      `4️⃣ Busca la opción *"Añadir a pantalla de inicio"* o *"Instalar app"* y tócala\n\n` +
      `5️⃣ ¡Listo! Ya te queda el ícono de KÚMA en tu celular como cualquier app 🍫\n\n` +
      `Desde ahí puedes:\n` +
      `🛒 Comprar tu chocolate\n` +
      `🌳 Ver tu red y ganar comisiones\n` +
      `🎰 Girar la Ruleta de Premios todos los días\n` +
      `💳 Ver tu billetera de puntos\n\n` +
      `¡Te espero adentro! 🇨🇴`
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      <div className="bg-cacao-oscuro px-4 py-3">
        <h2 className="text-base font-extrabold text-kuma-dorado">🍫 Tu enlace para invitar</h2>
        <p className="text-xs text-blanco-cacao/60 mt-1">
          Comparte y gana comisiones por cada persona que se una.
        </p>
      </div>
      <div className="bg-white p-4 space-y-3">
        <p className="break-all rounded-xl bg-blanco-cacao p-3 text-sm text-cacao-oscuro border border-cacao-fresco/20">
          {referralLink}
        </p>
        <button
          onClick={handleCopy}
          className="w-full rounded-xl bg-kuma-dorado py-3 font-extrabold text-cacao-oscuro hover:opacity-90"
        >
          {copied ? '¡Copiado! ✅' : '📋 Copiar enlace'}
        </button>
        <button
          onClick={handleWhatsApp}
          className="w-full rounded-xl bg-[#25D366] py-3 font-extrabold text-white hover:opacity-90"
        >
          📲 Compartir por WhatsApp
        </button>
      </div>
    </div>
  )
}
