import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PurchaseForm } from '@/components/PurchaseForm'
import type { Package, RewardVoucher, Wallet } from '@/lib/types'

export default async function ComprarPage({ params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .select('*')
    .eq('code', params.code)
    .single()

  if (pkgError) {
    console.error('packages select failed:', pkgError.message)
  }

  if (!pkg) notFound()

  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (walletError) {
    console.error('wallets select failed:', walletError.message)
  }

  const { data: voucher, error: voucherError } = await supabase
    .from('reward_vouchers')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'available')
    .order('discount_amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (voucherError) {
    console.error('reward_vouchers select failed:', voucherError.message)
  }

  return (
    <PurchaseForm
      pkg={pkg as Package}
      availableBalance={(wallet as Wallet | null)?.balance_available ?? 0}
      voucher={(voucher as RewardVoucher | null) ?? null}
    />
  )
}
