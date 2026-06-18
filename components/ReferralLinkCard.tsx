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
      `¡Hola! 👋 Te quiero contar sobre *KÚMA*, chocolate 100% cacao puro colombiano — sin azúcar ni conservantes.\n\n` +
      `Se vende en tres paquetes (envío incluido):\n` +
      `🍫 Paquete Personal — $90.000\n` +
      `🍫 Paquete Pareja — $180.000\n` +
      `🍫 Paquete Familiar — $270.000\n\n` +
      `Puedes registrarte gratis y hacer tu pedido directo desde la app. Si además quieres recomendar KÚMA a otras personas, ganas comisiones reales por cada compra.\n\n` +
      `👉 Regístrate aquí con mi enlace:\n${referralLink}`
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
