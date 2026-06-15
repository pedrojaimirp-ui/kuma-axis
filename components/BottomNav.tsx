'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, StoreIcon, NetworkIcon, WalletIcon, RouletteIcon, AdminIcon } from './icons/NavIcons'

const ITEMS = [
  { href: '/inicio', label: 'Inicio', Icon: HomeIcon, color: '#F2B705' },
  { href: '/tienda', label: 'Tienda', Icon: StoreIcon, color: '#C17817' },
  { href: '/red', label: 'Red', Icon: NetworkIcon, color: '#9CCC3C' },
  { href: '/billetera', label: 'Billetera', Icon: WalletIcon, color: '#2D6A4F' },
  { href: '/ruleta', label: 'Ruleta', Icon: RouletteIcon, color: '#00E5FF' },
]

const ADMIN_ITEM = { href: '/admin', label: 'Admin', Icon: AdminIcon, color: '#8E5A2D' }

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-cacao-fresco/20 bg-white">
      {items.map(({ href, label, Icon, color }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              active ? 'font-semibold text-cacao-oscuro' : 'text-cacao-tostado'
            }`}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
              style={{ backgroundColor: active ? color : 'transparent', color: active ? '#FDF6EC' : color }}
            >
              <Icon className="h-6 w-6" />
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
