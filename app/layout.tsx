import type { Metadata } from 'next'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'
import './globals.css'

export const metadata: Metadata = {
  title: 'KÚMA CACAO AXIS',
  description: 'KÚMA CACAO AXIS — chocolate 100% cacao puro colombiano',
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
