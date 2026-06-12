'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isValidColombianPhone, toSyntheticEmail } from '@/lib/phone'

export default function LoginPage() {
  const router = useRouter()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidColombianPhone(phone)) {
      setError('Ingresa un celular colombiano válido (10 dígitos, inicia en 3).')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: toSyntheticEmail(phone),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError('Celular o contraseña incorrectos.')
      return
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blanco-cacao px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-cacao-oscuro">
          Iniciar sesión — KÚMA AXIS
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Celular</label>
            <input
              type="tel"
              required
              placeholder="3001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Contraseña</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 pr-10 focus:border-kuma-dorado focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-cacao-tostado"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-cacao-tostado">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-semibold text-verde-natural">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  )
}
