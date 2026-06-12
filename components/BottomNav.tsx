'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/inicio', label: 'Inicio', icon: '🏠' },
  { href: '/tienda', label: 'Tienda', icon: '🛒' },
  { href: '/red', label: 'Red', icon: '🌳' },
  { href: '/billetera', label: 'Billetera', icon: '👛' },
  { href: '/ruleta', label: 'Ruleta', icon: '🎰' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-cacao-fresco/20 bg-white">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              active ? 'font-semibold text-kuma-dorado' : 'text-cacao-tostado'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
