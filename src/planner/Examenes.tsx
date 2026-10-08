import { useState } from 'react'
import { formatShortDate, today, weekdayName } from '../lib/dates'
import { useFeedback } from '../ui/feedback'
import { pdb, uid, type Examen } from './db'
import { useExamenes } from './hooks'
import { cuentaAtras, diasHasta } from './logic'
import { FilaCheck, Seccion, Vacio, card } from './ui'

const ICONO = { examen: '📚', entrega: '📝' } as const

/** Exámenes y entregas (TFG, trabajos…) con cuenta atrás. */
export function Examenes() {
  const todos = useExamenes() ?? []
  const hoy = today()
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState<Examen['tipo']>('examen')
  const [verPasados, setVerPasados] = useState(false)
  const { showUndo } = useFeedback()

  const proximos = todos.filter((e) => e.fecha >= hoy && !e.hecho).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const pasados = todos.filter((e) => e.fecha < hoy || e.hecho).sort((a, b) => b.fecha.localeCompare(a.fecha))

  const anadir = async () => {
    if (!titulo.trim() || !fecha) return
    await pdb.examenes.add({ id: uid(), titulo: titulo.trim(), fecha, tipo, hecho: false })
    setTitulo('')
    setFecha('')
  }

  const borrar = async (e: Examen) => {
    await pdb.examenes.delete(e.id)
    showUndo(`«${e.titulo}» borrado`, () => void pdb.examenes.put(e))
  }

  const fila = (e: Examen) => {
    const dias = diasHasta(e.fecha, hoy)
    return (
      <FilaCheck
        key={e.id}
        hecho={e.hecho}
        texto={`${ICONO[e.tipo]} ${e.titulo}`}
        onToggle={() => void pdb.examenes.update(e.id, { hecho: !e.hecho })}
        sub={
          <p className="text-sm text-gris">
            {weekdayName(e.fecha)} {formatShortDate(e.fecha)} ·{' '}
            <strong className={!e.hecho && dias >= 0 && dias <= 7 ? 'text-aviso' : ''}>{cuentaAtras(dias)}</strong>
          </p>
        }
      >
        <button onClick={() => void borrar(e)} aria-label={`Borrar ${e.titulo}`} className="h-12 w-10 shrink-0 text-lg text-gris">
          ✕
        </button>
      </FilaCheck>
    )
  }

  return (
    <Seccion titulo="📚 Exámenes y entregas">
      <div className={card}>
        {proximos.length ? <ul>{proximos.map(fila)}</ul> : <Vacio>No tienes exámenes ni entregas a la vista.</Vacio>}
        <form
          className="mt-3 flex flex-col gap-2 border-t-2 border-crema-oscuro pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            void anadir()
          }}
        >
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Examen de…, entrega del TFG…"
            className="min-h-14 rounded-2xl border-2 border-borde bg-white px-4 text-lg outline-none focus:border-terra"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Fecha"
              className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-borde bg-white px-3 text-lg"
            />
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Examen['tipo'])} aria-label="Tipo" className="min-h-14 rounded-2xl border-2 border-borde bg-white px-3 text-lg">
              <option value="examen">Examen</option>
              <option value="entrega">Entrega</option>
            </select>
          </div>
          <button type="submit" disabled={!titulo.trim() || !fecha} className="min-h-14 rounded-2xl bg-terra text-lg font-bold text-white disabled:opacity-50">
            Añadir
          </button>
        </form>
        {pasados.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setVerPasados(!verPasados)} className="min-h-12 text-base font-semibold text-terra">
              {verPasados ? 'Ocultar' : 'Ver'} pasados y hechos ({pasados.length})
            </button>
            {verPasados && <ul>{pasados.map(fila)}</ul>}
          </div>
        )}
      </div>
    </Seccion>
  )
}
