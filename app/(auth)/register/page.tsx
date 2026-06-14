'use client'

import { Suspense, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isValidColombianPhone, toSyntheticEmail } from '@/lib/phone'
import { isValidPassword } from '@/lib/validation'
import { generateReferralCode } from '@/lib/referral'

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidColombianPhone(phone)) {
      setError('Ingresa un celular colombiano válido (10 dígitos, inicia en 3).')
      return
    }
    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    let referredBy: string | null = null
    if (refCode) {
      const { data, error: refError } = await supabase.rpc('resolve_referral_code', { code: refCode })
      if (refError) console.error('resolve_referral_code failed:', refError.message)
      referredBy = (data as string | null) ?? null
    }

    let signUpError: { message: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const referralCode = generateReferralCode()
      const { error: err } = await supabase.auth.signUp({
        email: toSyntheticEmail(phone),
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            referral_code: referralCode,
            referred_by: referredBy,
          },
        },
      })

      if (!err) {
        signUpError = null
        break
      }

      signUpError = err
      if (!err.message.includes('referral_code')) break
    }

    setLoading(false)

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes('already registered')
          ? 'Este celular ya está registrado.'
          : 'No se pudo crear la cuenta. Intenta de nuevo.'
      )
      return
    }

    router.push('/inicio')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blanco-cacao px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-cacao-oscuro">KÚMA CACAO AXIS</h1>
        <p className="mb-6 text-center text-sm text-cacao-fresco">
          🍫 Red de consumo 100% cacao puro
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cacao-oscuro">Nombre completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
            />
          </div>
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
          <label className="flex items-start gap-2 text-sm text-cacao-tostado">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
            />
            Acepto los términos y condiciones de KÚMA CACAO AXIS.
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-cacao-tostado">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-verde-natural">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
