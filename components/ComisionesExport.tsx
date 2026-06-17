'use client'

import { useState, useMemo } from 'react'

type Comision = {
  id: string
  created_at: string
  amount: number
  type: string
  description: string
  profiles: { full_name: string; email: string | null; phone: string | null } | null
}

const NIVEL: Record<string, string> = {
  commission_l1: 'Nivel 1',
  commission_l2: 'Nivel 2',
  commission_l3: 'Nivel 3',
  commission_l4: 'Nivel 4',
}

export function ComisionesExport({ comisiones }: { comisiones: Comision[] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const filtradas = useMemo(() => {
    return comisiones.filter((c) => {
      const fecha = c.created_at.slice(0, 10)
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
      return true
    })
  }, [comisiones, desde, hasta])

  const total = filtradas.reduce((s, c) => s + Number(c.amount), 0)

  function exportarCSV() {
    const encabezado = ['Fecha', 'Nombre distribuidor', 'Teléfono', 'Email', 'Nivel', 'Valor ($COP)', 'Descripción']
    const filas = filtradas.map((c) => [
      c.created_at.slice(0, 10),
      c.profiles?.full_name ?? '',
      c.profiles?.phone ?? '',
      c.profiles?.email ?? '',
      NIVEL[c.type] ?? c.type,
      String(c.amount),
      c.description,
    ])
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comisiones-kuma-${desde || 'inicio'}-${hasta || 'hoy'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-cacao-tostado mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-cacao-fresco/40 px-3 py-1.5 text-sm focus:border-kuma-dorado focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cacao-tostado mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-cacao-fresco/40 px-3 py-1.5 text-sm focus:border-kuma-dorado focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={exportarCSV}
            className="rounded-lg bg-kuma-dorado px-4 py-1.5 text-sm font-bold text-cacao-oscuro hover:opacity-90"
          >
            Exportar CSV para contador
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="rounded-xl bg-cacao-oscuro px-4 py-3 text-blanco-cacao">
        <span className="text-sm">Total comisiones en el período: </span>
        <span className="font-bold text-kuma-dorado">${total.toLocaleString('es-CO')}</span>
        <span className="ml-3 text-sm text-blanco-cacao/60">{filtradas.length} transacciones</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cacao-fresco/20 text-left text-xs font-semibold text-cacao-tostado">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Distribuidor</th>
              <th className="px-3 py-2">Nivel</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-cacao-tostado">No hay comisiones en este período.</td></tr>
            )}
            {filtradas.map((c) => (
              <tr key={c.id} className="border-b border-cacao-fresco/10 hover:bg-blanco-cacao/50">
                <td className="px-3 py-2 text-cacao-tostado">{c.created_at.slice(0, 10)}</td>
                <td className="px-3 py-2 font-medium text-cacao-oscuro">
                  {c.profiles?.full_name ?? '—'}
                  {c.profiles?.phone && <span className="ml-1 text-xs text-cacao-tostado">· {c.profiles.phone}</span>}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-kuma-dorado/20 px-2 py-0.5 text-xs font-semibold text-cacao-oscuro">
                    {NIVEL[c.type] ?? c.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-verde-natural">
                  ${Number(c.amount).toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
