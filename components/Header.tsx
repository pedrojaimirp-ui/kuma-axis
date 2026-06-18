import { SignOutButton } from './SignOutButton'

export function Header({ fullName, loyaltyPoints }: { fullName: string; loyaltyPoints: number }) {
  return (
    <header className="flex items-center justify-between bg-cacao-oscuro px-4 py-3 text-blanco-cacao shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-3xl">🍫</span>
        <div>
          <span className="text-base font-extrabold text-kuma-dorado tracking-wide">KÚMA</span>
          <span className="text-xs text-blanco-cacao/60 ml-1">CACAO AXIS</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-blanco-cacao/60">{fullName}</p>
        <p className="font-bold text-kuma-dorado text-sm">{loyaltyPoints.toLocaleString('es-CO')} pts</p>
        <SignOutButton />
      </div>
    </header>
  )
}
