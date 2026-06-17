import { SignOutButton } from './SignOutButton'

export function Header({ fullName, loyaltyPoints }: { fullName: string; loyaltyPoints: number }) {
  return (
    <header className="flex items-center justify-between bg-cacao-oscuro px-4 py-3 text-blanco-cacao">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍫</span>
        <span className="text-lg font-bold text-kuma-dorado">KÚMA CACAO AXIS</span>
      </div>
      <div className="text-right">
        <p className="text-xs text-blanco-cacao/70">{fullName}</p>
        <p className="font-semibold text-acento-digital">{loyaltyPoints.toLocaleString('es-CO')} Puntos KÚMA</p>
        <SignOutButton />
      </div>
    </header>
  )
}
