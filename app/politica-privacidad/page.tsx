import Link from 'next/link'

export default function PoliticaPrivacidadPage() {
  return (
    <main className="min-h-screen bg-blanco-cacao px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link href="/" className="text-sm text-verde-natural">← Volver</Link>
        </div>

        <h1 className="text-2xl font-bold text-cacao-oscuro">Política de Tratamiento de Datos Personales</h1>
        <p className="text-xs text-cacao-fresco">KÚMA CACAO AXIS · Operada por PEDRAZA INMOBILIARIA COMERCIALIZADORA S.A.S · NIT 400.000.440.884 · Versión 1.0 — Junio 2026</p>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">1. Responsable del tratamiento</h2>
          <p className="text-sm text-cacao-tostado">Razón social: PEDRAZA INMOBILIARIA COMERCIALIZADORA S.A.S · NIT: 400.000.440.884 · Matrícula mercantil: 0000440884, Cámara de Comercio de Villavicencio · Domicilio: Villavicencio, Meta, Colombia · Correo: kumacacaoaxis@gmail.com · Plataforma: kuma-axis.vercel.app</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">2. Marco legal</h2>
          <p className="text-sm text-cacao-tostado">Esta política se rige por la Ley 1581 de 2012 (Habeas Data), el Decreto 1377 de 2013 y la Circular SIC 003 de 2021.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">3. Datos que recolectamos</h2>
          <p className="text-sm text-cacao-tostado">Al registrarse recolectamos: nombre completo (identificación y pedidos), número de celular (contacto y autenticación), contraseña cifrada (acceso seguro), dirección de entrega (despacho de pedidos), historial de compras (comisiones y soporte) y código de referido (trazabilidad de la red). No recolectamos datos financieros de tarjetas, cédula ni datos sensibles según el artículo 5 de la Ley 1581 de 2012.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">4. Finalidades del tratamiento</h2>
          <p className="text-sm text-cacao-tostado">Sus datos se usan exclusivamente para: gestionar su cuenta, procesar y despachar pedidos, calcular comisiones por referidos, gestionar retiros y devoluciones, enviar notificaciones de pedidos y cumplir obligaciones legales. Sus datos NO serán vendidos ni compartidos con terceros con fines comerciales.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">5. Sus derechos</h2>
          <p className="text-sm text-cacao-tostado">Conforme al artículo 8 de la Ley 1581 de 2012, usted tiene derecho a conocer, actualizar, rectificar y suprimir sus datos, revocar la autorización y presentar quejas ante la SIC (sic.gov.co). Para ejercerlos escríbanos a kumacacaoaxis@gmail.com — respondemos en máximo 15 días hábiles.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">6. Seguridad</h2>
          <p className="text-sm text-cacao-tostado">Los datos se almacenan en infraestructura cifrada (Supabase, SOC 2 Type II), las contraseñas se guardan con cifrado bcrypt y todas las conexiones usan HTTPS/TLS. Solo personal autorizado tiene acceso.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">7. Vigencia</h2>
          <p className="text-sm text-cacao-tostado">Sus datos se conservan mientras mantenga una cuenta activa o sea necesario para cumplir obligaciones legales (mínimo 5 años por normativa contable). Después se eliminan de forma segura.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">8. Autorización</h2>
          <p className="text-sm text-cacao-tostado">Al crear su cuenta y marcar "Acepto los términos y condiciones", usted otorga autorización libre, previa, expresa e informada para el tratamiento de sus datos conforme a esta política, según el artículo 9 de la Ley 1581 de 2012.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-cacao-oscuro">9. Contacto</h2>
          <p className="text-sm text-cacao-tostado">Correo: kumacacaoaxis@gmail.com · Plazo de respuesta: 15 días hábiles · Entidad de control: Superintendencia de Industria y Comercio — sic.gov.co</p>
        </section>

        <div className="pt-4 border-t border-cacao-fresco/20">
          <Link href="/terminos" className="text-sm text-verde-natural">Ver Términos y Condiciones →</Link>
        </div>
      </div>
    </main>
  )
}
