import Link from 'next/link'

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-blanco-cacao px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link href="/" className="text-sm text-verde-natural">← Volver</Link>
        </div>

        <h1 className="text-2xl font-bold text-cacao-oscuro">Términos y Condiciones de Uso</h1>
        <p className="text-xs text-cacao-fresco">KÚMA CACAO AXIS · Operada por PEDRAZA INMOBILIARIA COMERCIALIZADORA S.A.S · NIT 400.000.440.884 · Versión 1.0 — Junio 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">1. Identificación de la empresa</h2>
          <p className="text-sm text-cacao-tostado">Razón social: PEDRAZA INMOBILIARIA COMERCIALIZADORA S.A.S · NIT: 400.000.440.884 · Matrícula mercantil: 0000440884, Cámara de Comercio de Villavicencio · Domicilio: Villavicencio, Meta, Colombia · Correo: kumacacaoaxis@gmail.com</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">2. Objeto y aceptación</h2>
          <p className="text-sm text-cacao-tostado">KÚMA CACAO AXIS es una plataforma digital de comercio electrónico que permite comprar chocolate 100% cacao y, de forma voluntaria y opcional, participar en un programa de referidos. Al crear una cuenta usted acepta estos términos en su totalidad.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">3. Quiénes pueden registrarse</h2>
          <p className="text-sm text-cacao-tostado">Personas naturales mayores de 18 años, con celular colombiano activo y residencia en Colombia.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">4. Los productos</h2>
          <p className="text-sm text-cacao-tostado">Paquetes de chocolate 100% cacao, sin azúcar añadida ni conservantes, con registro INVIMA vigente. Los precios incluyen el valor del producto y el costo de envío. El precio publicado al momento del pedido es el precio definitivo.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">5. Proceso de compra</h2>
          <p className="text-sm text-cacao-tostado">El usuario selecciona un paquete, diligencia la dirección de entrega y recibe una referencia de pago. Luego realiza la transferencia bancaria o pago por Nequi. El administrador confirma el pago y despacha el pedido. Pedidos sin pago confirmado en 48 horas podrán ser descartados.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">6. Tiempos de entrega</h2>
          <p className="text-sm text-cacao-tostado">Despacho dentro de los 3 días hábiles siguientes a la confirmación del pago. Los tiempos de tránsito dependen del transportador y el destino.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">7. Política de devoluciones</h2>
          <p className="text-sm text-cacao-tostado">Conforme al artículo 47 de la Ley 1480 de 2011, tiene 5 días hábiles desde la entrega para solicitar devolución si el producto llega en mal estado, incompleto o no corresponde a lo pedido. La solicitud se realiza desde "Mis Pedidos". Si es aprobada, el valor se acredita a su billetera virtual. No aplica devolución por cambio de opinión una vez entregado en buen estado.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">8. Programa de referidos (opcional)</h2>
          <p className="text-sm text-cacao-tostado">El programa de referidos es completamente voluntario. Comprar chocolate KÚMA no requiere participar en él. Cada usuario registrado recibe un código único. Si alguien se registra y compra usando su código, usted recibe una comisión en su billetera virtual, calculada por niveles (L1, L2, L3, L4) según la tabla vigente en la plataforma. Las comisiones aplican solo sobre la primera compra pagada de cada referido.</p>
          <p className="text-sm text-cacao-tostado">Las comisiones son una cortesía comercial, no una obligación garantizada. PEDRAZA INMOBILIARIA COMERCIALIZADORA S.A.S puede modificar la tabla con aviso previo de 10 días. El programa no constituye captación masiva de dinero ni pirámide financiera — su base es la venta real de productos de consumo con registro INVIMA.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">9. Prohibiciones</h2>
          <p className="text-sm text-cacao-tostado">Queda prohibido crear cuentas falsas o múltiples para auto-referirse, realizar pagos ficticios, prometer ganancias garantizadas a terceros o usar la marca KÚMA de forma que induzca a error. El incumplimiento genera suspensión inmediata de la cuenta.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">10. Ley aplicable</h2>
          <p className="text-sm text-cacao-tostado">Estos términos se rigen por las leyes de Colombia. Para controversias, las partes se someten a los jueces competentes de Villavicencio, Meta.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">11. Contacto</h2>
          <p className="text-sm text-cacao-tostado">Correo: kumacacaoaxis@gmail.com · Plazo de respuesta: 15 días hábiles · También puede acudir a la Superintendencia de Industria y Comercio (SIC): sic.gov.co</p>
        </section>

        <div className="pt-4 border-t border-cacao-fresco/20">
          <Link href="/politica-privacidad" className="text-sm text-verde-natural">Ver Política de Privacidad →</Link>
        </div>
      </div>
    </main>
  )
}
