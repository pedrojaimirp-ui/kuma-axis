'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createOrder, purchaseWithBalance } from '@/lib/actions/orders'
import type { Package, RewardVoucher, ShippingAddress } from '@/lib/types'

const DAVIVIENDA_ACCOUNT = '4884 1069 8499'

export function PurchaseForm({
  pkg,
  availableBalance,
  voucher,
}: {
  pkg: Package
  availableBalance: number
  voucher: RewardVoucher | null
}) {
  const router = useRouter()
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [address, setAddress] = useState<ShippingAddress>({
    calle: '',
    ciudad: '',
    departamento: '',
    telefono: '',
  })
  const [autoRenew, setAutoRenew] = useState(false)
  const [applyVoucher, setApplyVoucher] = useState(Boolean(voucher))
  const [paymentReference, setPaymentReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const discount = voucher && applyVoucher ? voucher.discount_amount : 0
  const finalPrice = Math.max(Number(pkg.price) - discount, 0)
  const canPayWithBalance = availableBalance >= finalPrice

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
        voucherId: voucher && applyVoucher ? voucher.id : undefined,
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
      await purchaseWithBalance({
        packageCode: pkg.code,
        shippingAddress: address,
        autoRenew,
        voucherId: voucher && applyVoucher ? voucher.id : undefined,
      })
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

        {voucher && (
          <label className="flex items-start gap-2 rounded-lg bg-verde-natural/10 p-3 text-sm text-cacao-oscuro">
            <input
              type="checkbox"
              checked={applyVoucher}
              onChange={(e) => setApplyVoucher(e.target.checked)}
              className="mt-1"
            />
            <span>
              Tienes un cupón de <strong>${voucher.discount_amount.toLocaleString('es-CO')}</strong> de
              descuento disponible. Se aplicará a esta compra.
            </span>
          </label>
        )}

        {canPayWithBalance && (
          <div className="rounded-lg bg-verde-natural/10 p-3">
            <p className="text-sm text-cacao-tostado">
              Tienes ${availableBalance.toLocaleString('es-CO')} Puntos KÚMA disponibles.
            </p>
            <button
              onClick={handlePayWithBalance}
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-verde-natural py-2 font-semibold text-blanco-cacao hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : `Pagar con mis Puntos KÚMA ($${finalPrice.toLocaleString('es-CO')})`}
            </button>
          </div>
        )}

        <div className="rounded-xl bg-kuma-dorado/20 border border-kuma-dorado p-4 text-center space-y-1">
          <p className="font-bold text-cacao-oscuro">⏳ Datos de pago en actualización</p>
          <p className="text-sm text-cacao-tostado">
            Estamos configurando la cuenta bancaria empresarial de KÚMA CACAO AXIS.
            En breve estará disponible. Para completar tu pedido escríbenos a{' '}
            <span className="font-semibold text-verde-natural">kumacacaoaxis@gmail.com</span>
          </p>
        </div>

        <p className="text-sm text-cacao-tostado">
          Confirma tu pedido y nos comunicamos contigo para coordinar el pago.
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
