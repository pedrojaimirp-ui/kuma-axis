import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('profiles select failed:', profileError.message)
  }

  const { data: loyalty } = await supabase
    .from('loyalty_points')
    .select('points')
    .eq('user_id', user.id)
    .single()

  const isAdmin = !!profile && ['admin', 'owner'].includes(profile.role)

  return (
    <div
      className="min-h-screen bg-blanco-cacao pb-16"
      style={{ backgroundImage: 'url(/patterns/kuma-watermark.svg)', backgroundRepeat: 'repeat' }}
    >
      <Header fullName={profile?.full_name ?? ''} loyaltyPoints={loyalty?.points ?? 0} />
      <main className="px-4 py-4">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
