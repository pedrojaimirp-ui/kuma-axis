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

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-cacao-oscuro">Tu enlace para invitar 🍫</h2>
      <p className="mt-1 text-sm text-cacao-tostado">
        Comparte este enlace para que tus invitados se registren en tu red.
      </p>
      <p className="mt-3 break-all rounded-lg bg-blanco-cacao p-3 text-sm text-cacao-oscuro">
        {referralLink}
      </p>
      <button
        onClick={handleCopy}
        className="mt-3 w-full rounded-lg bg-kuma-dorado py-3 font-bold text-cacao-oscuro hover:opacity-90"
      >
        {copied ? '¡Copiado! ✅' : 'Copiar enlace'}
      </button>
    </div>
  )
}
