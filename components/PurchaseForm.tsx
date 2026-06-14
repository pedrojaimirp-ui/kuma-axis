'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createOrder, purchaseWithBalance } from '@/lib/actions/orders'
import type { Package, ShippingAddress } from '@/lib/types'

const DAVIVIENDA_ACCOUNT = '4884 1069 8499'

export function PurchaseForm({ pkg, availableBalance }: { pkg: Package; availableBalance: number }) {
  const router = useRouter()
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [address, setAddress] = useState<ShippingAddress>({
    calle: '',
    ciudad: '',
    departamento: '',
    telefono: '',
  })
  const [autoRenew, setAutoRenew] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canPayWithBalance = availableBalance >= Number(pkg.price)

  function handleAddressSubmit(e: FormEvent) {
    e.preventDefault()
    if (!address.calle || !address.ciudad || !address.departamento || !address.telefono) {
      setError('Completa todos los campos de la dirección.')
      return
    }
    setError(null)
    setStep('payment')
  }

  async function handleConfirmPayment() {
    setLoading(true)
    setError(null)
    try {
      await createOrder({
        packageCode: pkg.code,
        shippingAddress: address,
        autoRenew,
        paymentReference: paymentReference || undefined,
      })
      router.push('/tienda/pedidos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pedido.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePayWithBalance() {
    setLoading(true)
    setError(null)
    try {
      await purchaseWithBalance({ packageCode: pkg.code, shippingAddress: address, autoRenew })
      router.push('/tienda/pedidos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la compra con saldo.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'payment') {
    return (
      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-cacao-oscuro">Pagar {pkg.name}</h1>

        {canPayWithBalance && (
          <div className="rounded-lg bg-verde-natural/10 p-3">
            <p className="text-sm text-cacao-tostado">
              Tienes ${availableBalance.toLocaleString('es-CO')} puntos KCA disponibles.
            </p>
            <button
              onClick={handlePayWithBalance}
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-verde-natural py-2 font-semibold text-blanco-cacao hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : `Pagar con mis puntos KCA ($${Number(pkg.price).toLocaleString('es-CO')})`}
            </button>
          </div>
        )}

        <p className="text-cacao-tostado">
          O transfiere{' '}
          <span className="font-bold text-kuma-dorado">${Number(pkg.price).toLocaleString('es-CO')}</span> a
          cualquiera de estos medios:
        </p>

        <div className="space-y-2">
          <div className="rounded-lg bg-blanco-cacao p-3 text-center">
            <p className="text-sm text-cacao-tostado">Escanea para pagar (Bre-B / Nequi / cualquier banco)</p>
            <Image src="/payment-qr.png" alt="QR de pago" width={220} height={220} className="mx-auto mt-2" />
          </div>
          <div className="rounded-lg bg-blanco-cacao p-3">
            <p className="text-sm text-cacao-tostado">Davivienda - Cuenta de ahorros</p>
            <p className="text-lg font-bold text-verde-natural">{DAVIVIENDA_ACCOUNT}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cacao-oscuro">
            Número de referencia / comprobante (opcional)
          </label>
          <input
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Ej: 123456789"
            className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
          />
        </div>

        <p className="text-sm text-cacao-tostado">
          Cuando hayas hecho la transferencia, confirma tu pedido. Un administrador verificará
          el pago.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Ya pagué'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleAddressSubmit} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
      <h1 className="text-xl font-bold text-cacao-oscuro">Comprar {pkg.name}</h1>
      <p className="text-cacao-tostado">
        {pkg.bags} bolsas · ${Number(pkg.price).toLocaleString('es-CO')}
      </p>

      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Calle / dirección</label>
        <input
          required
          value={address.calle}
          onChange={(e) => setAddress({ ...address, calle: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Ciudad</label>
        <input
          required
          value={address.ciudad}
          onChange={(e) => setAddress({ ...address, ciudad: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Departamento</label>
        <input
          required
          value={address.departamento}
          onChange={(e) => setAddress({ ...address, departamento: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cacao-oscuro">Teléfono de contacto</label>
        <input
          required
          value={address.telefono}
          onChange={(e) => setAddress({ ...address, telefono: e.target.value })}
          className="mt-1 w-full rounded-lg border border-cacao-fresco/40 px-3 py-2 focus:border-kuma-dorado focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-cacao-tostado">
        <input
          type="checkbox"
          checked={autoRenew}
          onChange={(e) => setAutoRenew(e.target.checked)}
        />
        Activar recompra mensual automática
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-lg bg-kuma-dorado py-2 font-semibold text-cacao-oscuro hover:opacity-90"
      >
        Continuar al pago
      </button>
    </form>
  )
}
