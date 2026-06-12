import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PackageCard } from '@/components/PackageCard'
import type { Package } from '@/lib/types'

export default async function TiendaPage() {
  const supabase = createClient()
  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  if (packagesError) {
    console.error('packages select failed:', packagesError.message)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-cacao-oscuro">Tienda</h1>
        <Link href="/tienda/pedidos" className="text-sm font-semibold text-verde-natural">
          Mis pedidos
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(packages as Package[] | null)?.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </div>
  )
}
