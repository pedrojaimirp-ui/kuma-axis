import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PurchaseForm } from '@/components/PurchaseForm'
import type { Package } from '@/lib/types'

export default async function ComprarPage({ params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: pkg, error: pkgError } = await supabase
    .from('packages')
    .select('*')
    .eq('code', params.code)
    .single()

  if (pkgError) {
    console.error('packages select failed:', pkgError.message)
  }

  if (!pkg) notFound()

  return <PurchaseForm pkg={pkg as Package} />
}
