import { useEffect, useRef, useState } from 'react'
import { uid, type Fila, type Mes } from './db'
import { cargarMes, guardarMes } from './hooks'
import { esMesActualOFuturo, fmtDinero, fmtImporte, mesKey, mesLabel, moverMes, parseImporte, suma } from './logic'

type Seccion = 'ingresos' | 'gastosFijos' | 'gastosVariables'

/** «Cuentas Claras» dentro del planner: ingresos, gastos fijos y gastos variables por mes. */
export function DineroPage() {
  const [key, setKey] = useState(() => mesKey(new Date()))
  const [mes, setMes] = useState<Mes | null>(null)
  const [guardando, setGuardando] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendiente = useRef<{ mes: Mes; fijos: boolean } | null>(null)

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const p = pendiente.current
    pendiente.current = null
    if (p) await guardarMes(p.mes, p.fijos)
    setGuardando(false)
  }

  useEffect(() => {
    let vivo = true
    void cargarMes(key).then((m) => vivo && setMes(m))
    return () => {
      vivo = false
    }
  }, [key])

  // Guardar lo pendiente al salir de la pantalla.
  useEffect(() => () => void flush(), [])

  const cambiar = (seccion: Seccion, filas: Fila[], inmediato = false) => {
    if (!mes) return
    const nuevo = { ...mes, [seccion]: filas }
    setMes(nuevo)
    setGuardando(true)
    pendiente.current = { mes: nuevo, fijos: (pendiente.current?.fijos ?? false) || seccion === 'gastosFijos' }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), inmediato ? 0 : 600)
  }

  const irA = async (k: string) => {
    await flush()
    setMes(null)
    setKey(k)
  }

  const ingresos = suma(mes?.ingresos ?? [])
  const fijos = suma(mes?.gastosFijos ?? [])
  const variables = suma(mes?.gastosVariables ?? [])
  const disponible = ingresos - fijos - variables

  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button onClick={() => void irA(moverMes(key, -1))} aria-label="Mes anterior" className="h-12 w-12 shrink-0 rounded-xl border-2 border-borde bg-white text-xl">
          ‹
        </button>
        <label className="relative flex h-12 flex-1 items-center rounded-xl border-2 border-borde bg-white px-4">
          <span className="pointer-events-none text-lg font-bold">{mesLabel(key)}</span>
          <input type="month" value={key} onChange={(e) => e.target.value && void irA(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Elegir mes" />
        </label>
        <button onClick={() => void irA(moverMes(key, 1))} aria-label="Mes siguiente" className="h-12 w-12 shrink-0 rounded-xl border-2 border-borde bg-white text-xl">
          ›
        </button>
      </div>

      <section className="rounded-3xl border-2 border-borde bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold tracking-wide text-gris uppercase">Disponible ahora</p>
          <span className="text-sm text-gris">{guardando ? 'Guardando…' : 'Guardado ✓'}</span>
        </div>
        <p className={`mt-1 text-4xl font-extrabold tabular-nums ${disponible < 0 ? 'text-[#a6402c]' : 'text-oliva'}`}>{fmtDinero(disponible)}</p>
        <p className="mt-1 text-sm text-gris">Ingresos − gastos fijos − gastos variables de este mes</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-borde pt-4">
          <p className="max-w-[60ch] text-base text-gris">Presupuesto para variables e imprevistos (ingresos − fijos), antes de restar lo ya gastado este mes:</p>
          <p className="text-xl font-bold text-oliva tabular-nums">{fmtDinero(ingresos - fijos)}</p>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['sec-ingresos', 'Ingresos', ingresos, 'bg-oliva-claro'],
            ['sec-fijos', 'Gastos fijos', fijos, 'bg-terra-claro'],
            ['sec-variables', 'Gastos variables', variables, 'bg-amarillo-claro'],
          ] as const
        ).map(([id, label, total, bg]) => (
          <button key={id} onClick={() => scroll(id)} className={`rounded-2xl border-2 border-borde p-3 text-left ${bg}`}>
            <p className="text-sm font-bold text-gris">{label}</p>
            <p className="mt-1 text-base font-bold tabular-nums">{fmtDinero(total)}</p>
          </button>
        ))}
      </div>

      {mes ? (
        <>
          <Libro id="sec-ingresos" titulo="Ingresos" filas={mes.ingresos} vacio="Añade tu primer ingreso." onChange={(f, i) => cambiar('ingresos', f, i)} />
          <Libro
            id="sec-fijos"
            titulo="Gastos fijos"
            pista="Se repiten automáticamente en los meses siguientes. Si algún mes no aplica uno, bórralo solo en ese mes."
            filas={mes.gastosFijos}
            vacio="Añade tu primer gasto fijo."
            onChange={(f, i) => cambiar('gastosFijos', f, i)}
          />
          <Libro id="sec-variables" titulo="Gastos variables" filas={mes.gastosVariables} vacio="Sin gastos variables todavía." onChange={(f, i) => cambiar('gastosVariables', f, i)} />
        </>
      ) : (
        <p className="py-6 text-center text-gris">Cargando…</p>
      )}
      <p className="text-center text-sm text-gris">
        Los cambios se guardan automáticamente.
        {!esMesActualOFuturo(key) && ' En meses pasados, cambiar los fijos no toca los meses siguientes.'}
      </p>
    </div>
  )
}

function Libro({
  id,
  titulo,
  pista,
  filas,
  vacio,
  onChange,
}: {
  id: string
  titulo: string
  pista?: string
  filas: Fila[]
  vacio: string
  onChange: (filas: Fila[], inmediato?: boolean) => void
}) {
  const [enfocar, setEnfocar] = useState<string | null>(null)
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="px-1 text-lg font-extrabold">{titulo}</h2>
      {pista && <p className="mb-2 px-1 text-sm text-gris">{pista}</p>}
      <div className="mt-1 overflow-hidden rounded-2xl border-2 border-borde bg-white">
        {filas.length === 0 && <p className="p-4 text-center text-base text-gris">{vacio}</p>}
        {filas.map((f) => (
          <FilaDinero
            key={f.id}
            fila={f}
            autoFocus={enfocar === f.id}
            onChange={(nf) => onChange(filas.map((x) => (x.id === f.id ? nf : x)))}
            onDelete={() => onChange(filas.filter((x) => x.id !== f.id), true)}
          />
        ))}
        <button
          onClick={() => {
            const nueva = { id: uid(), concepto: '', importe: 0 }
            setEnfocar(nueva.id)
            onChange([...filas, nueva], true)
          }}
          className="block min-h-12 w-full border-t-2 border-dashed border-borde px-4 text-left text-base font-semibold text-gris"
        >
          + Añadir fila
        </button>
        <div className="grid grid-cols-[1fr_7rem_2.5rem] border-t-2 border-borde bg-crema text-base font-bold">
          <span className="px-4 py-2 font-medium text-gris">Subtotal</span>
          <span className="py-2 pr-2 text-right tabular-nums">{fmtDinero(suma(filas))}</span>
          <span />
        </div>
      </div>
    </section>
  )
}

function FilaDinero({ fila, autoFocus, onChange, onDelete }: { fila: Fila; autoFocus: boolean; onChange: (f: Fila) => void; onDelete: () => void }) {
  const [importe, setImporte] = useState(fila.importe ? fmtImporte(fila.importe) : '')
  return (
    <div className="grid grid-cols-[1fr_7rem_2.5rem] items-center border-t border-crema-oscuro first:border-t-0">
      <input
        value={fila.concepto}
        autoFocus={autoFocus}
        placeholder="Concepto"
        onChange={(e) => onChange({ ...fila, concepto: e.target.value })}
        className="min-h-12 min-w-0 bg-transparent px-4 text-base outline-none focus:bg-crema"
      />
      <input
        value={importe}
        inputMode="decimal"
        placeholder="0,00"
        onChange={(e) => {
          setImporte(e.target.value)
          onChange({ ...fila, importe: parseImporte(e.target.value) })
        }}
        onBlur={() => setImporte(fila.importe ? fmtImporte(fila.importe) : '')}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="min-h-12 min-w-0 bg-transparent pr-2 text-right text-base tabular-nums outline-none focus:bg-crema"
      />
      <button onClick={onDelete} aria-label="Eliminar fila" className="h-12 text-lg text-gris">
        ×
      </button>
    </div>
  )
}
