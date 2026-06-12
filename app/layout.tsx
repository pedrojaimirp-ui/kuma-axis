import type { Metadata } from 'next'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'
import './globals.css'

export const metadata: Metadata = {
  title: 'KÚMA AXIS',
  description: 'Comercio en red KÚMA ETERNA — chocolate 100% cacao',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
