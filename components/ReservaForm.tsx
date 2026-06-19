'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Package } from '@/lib/types'

export function ReservaForm({ packages }: { packages: Package[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReservar() {
    if (!selected) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase
      .from('reservations')
      .insert({ user_id: user.id, package_id: selected })

    setLoading(false)
    if (err) {
      setError('No se pudo guardar tu reserva. Intenta de nuevo.')
      return
    }
    router.push('/inicio')
  }

  return (
    <div className="space-y-3">
      <p className="font-semibold text-cacao-oscuro">Selecciona tu paquete:</p>

      {packages.map((pkg) => (
        <button
          key={pkg.id}
          onClick={() => setSelected(pkg.id)}
          className={`w-full rounded-xl border-2 p-4 text-left transition ${
            selected === pkg.id
              ? 'border-kuma-dorado bg-kuma-dorado/10'
              : 'border-cacao-fresco/20 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-cacao-oscuro">{pkg.name}</p>
              <p className="text-sm text-cacao-tostado">
                {pkg.bags} bolsas de 250 g de chocolate 100% cacao · ${Number(pkg.price).toLocaleString('es-CO')}
              </p>
              <p className="text-xs text-verde-natural mt-1">
                Hasta {pkg.max_direct_referrals} invitados directos
              </p>
            </div>
            <span className={`text-2xl ${selected === pkg.id ? 'opacity-100' : 'opacity-0'}`}>✅</span>
          </div>
        </button>
      ))}

      <button
        onClick={() => router.push('/inicio')}
        className="w-full rounded-lg py-2 text-sm text-cacao-tostado underline"
      >
        Decidir después
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleReservar}
        disabled={!selected || loading}
        className="w-full rounded-lg bg-kuma-dorado py-3 font-bold text-cacao-oscuro hover:opacity-90 disabled:opacity-40"
      >
        {loading ? 'Guardando...' : '🍫 Apartar mi paquete'}
      </button>

      <p className="text-center text-xs text-cacao-tostado/70">
        Puedes cambiar tu elección en cualquier momento antes de la apertura.
      </p>
    </div>
  )
}
