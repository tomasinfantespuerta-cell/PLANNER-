import { useState } from 'react'
import { today } from '../lib/dates'
import { Sheet } from '../ui/Sheet'
import { useFeedback } from '../ui/feedback'
import { ahora, pdb, uid, type CosaComprar, type Nota, type Tarea } from './db'
import { marcarTarea, nuevaTarea, useComprar, useNotas, useTareas } from './hooks'
import { pendientes } from './logic'
import { AddBar, FilaCheck, Segmentos, Vacio, card, usePestana } from './ui'

type Lista = 'pendientes' | 'comprar' | 'notas'
const LISTAS = ['pendientes', 'comprar', 'notas'] as const

export function ListasPage() {
  const [lista, setLista] = usePestana<Lista>('planner.listas', LISTAS, 'pendientes')
  return (
    <div className="flex flex-col gap-4">
      <Segmentos
        value={lista}
        onChange={setLista}
        opciones={[
          ['pendientes', '📌', 'Pendientes'],
          ['comprar', '🛍️', 'Por comprar'],
          ['notas', '🗒️', 'Notas'],
        ]}
      />
      {lista === 'pendientes' && <Pendientes />}
      {lista === 'comprar' && <PorComprar />}
      {lista === 'notas' && <Notas />}
    </div>
  )
}

function Pendientes() {
  const todas = pendientes(useTareas() ?? [])
  const { showUndo, showInfo } = useFeedback()
  const borrar = async (t: Tarea) => {
    await pdb.tareas.delete(t.id)
    showUndo('Pendiente borrado', () => void pdb.tareas.put(t))
  }
  return (
    <>
      <p className="px-1 text-base text-gris">Cosas que tienes que hacer pero sin día fijo. Con «→ Hoy» la pasas a las tareas de hoy.</p>
      <AddBar placeholder="Nuevo pendiente…" onAdd={(t) => nuevaTarea(t, null)} />
      <div className={card}>
        {todas.length ? (
          <ul>
            {todas.map((t) => (
              <FilaCheck key={t.id} hecho={t.hecha} texto={t.texto} onToggle={() => void marcarTarea(t.id, !t.hecha)}>
                {!t.hecha && (
                  <button
                    onClick={async () => {
                      await pdb.tareas.update(t.id, { fecha: today() })
                      showInfo('Pasado a hoy ✓')
                    }}
                    className="min-h-11 shrink-0 rounded-xl bg-terra-claro px-3 text-base font-bold text-terra-oscuro"
                  >
                    → Hoy
                  </button>
                )}
                <button onClick={() => void borrar(t)} aria-label={`Borrar ${t.texto}`} className="h-12 w-10 shrink-0 text-lg text-gris">
                  ✕
                </button>
              </FilaCheck>
            ))}
          </ul>
        ) : (
          <Vacio>No tienes pendientes. ¡Bien!</Vacio>
        )}
      </div>
    </>
  )
}

function PorComprar() {
  const cosas = (useComprar() ?? []).sort((a, b) => Number(a.hecha) - Number(b.hecha) || a.creada.localeCompare(b.creada))
  const { showUndo } = useFeedback()
  const comprados = cosas.filter((c) => c.hecha)
  const borrar = async (c: CosaComprar) => {
    await pdb.comprar.delete(c.id)
    showUndo('Borrado', () => void pdb.comprar.put(c))
  }
  const borrarComprados = async () => {
    await pdb.comprar.bulkDelete(comprados.map((c) => c.id))
    showUndo(`${comprados.length} borrados`, () => void pdb.comprar.bulkPut(comprados))
  }
  return (
    <>
      <p className="px-1 text-base text-gris">Cosas que quieres comprar que no son de la compra del súper: ropa, cosas para casa, para el campo…</p>
      <AddBar placeholder="Quiero comprar…" onAdd={(texto) => pdb.comprar.add({ id: uid(), texto, hecha: false, creada: ahora() })} />
      <div className={card}>
        {cosas.length ? (
          <ul>
            {cosas.map((c) => (
              <FilaCheck key={c.id} hecho={c.hecha} texto={c.texto} onToggle={() => void pdb.comprar.update(c.id, { hecha: !c.hecha })}>
                <button onClick={() => void borrar(c)} aria-label={`Borrar ${c.texto}`} className="h-12 w-10 shrink-0 text-lg text-gris">
                  ✕
                </button>
              </FilaCheck>
            ))}
          </ul>
        ) : (
          <Vacio>La lista está vacía.</Vacio>
        )}
      </div>
      {comprados.length > 0 && (
        <button onClick={() => void borrarComprados()} className="min-h-12 self-center text-base font-semibold text-terra">
          Quitar los comprados ({comprados.length})
        </button>
      )}
    </>
  )
}

function Notas() {
  const notas = useNotas() ?? []
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<Nota | null>(null)
  const guardar = async () => {
    const t = texto.trim()
    if (!t) return
    setTexto('')
    await pdb.notas.add({ id: uid(), texto: t, creada: ahora(), editada: ahora() })
  }
  return (
    <>
      <div className="flex flex-col gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Apunta una idea rápida…"
          rows={3}
          className="rounded-2xl border-2 border-borde bg-white p-4 text-lg outline-none focus:border-terra"
        />
        <button onClick={() => void guardar()} disabled={!texto.trim()} className="min-h-14 rounded-2xl bg-terra text-lg font-bold text-white disabled:opacity-50">
          Guardar nota
        </button>
      </div>
      {notas.length === 0 && <Vacio>Aún no tienes notas.</Vacio>}
      <ul className="flex flex-col gap-2">
        {notas.map((n) => (
          <li key={n.id}>
            <button onClick={() => setEditando(n)} className="w-full rounded-2xl border-2 border-borde bg-amarillo-claro p-4 text-left">
              <p className="text-lg whitespace-pre-wrap">{n.texto}</p>
              <p className="mt-1 text-sm text-gris">{new Date(n.editada).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </button>
          </li>
        ))}
      </ul>
      {editando && <EditarNota nota={editando} onClose={() => setEditando(null)} />}
    </>
  )
}

function EditarNota({ nota, onClose }: { nota: Nota; onClose: () => void }) {
  const [texto, setTexto] = useState(nota.texto)
  const { showUndo } = useFeedback()
  return (
    <Sheet title="Nota" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} className="rounded-2xl border-2 border-borde bg-white p-4 text-lg outline-none focus:border-terra" />
        <button
          onClick={async () => {
            if (texto.trim() && texto !== nota.texto) await pdb.notas.update(nota.id, { texto: texto.trim(), editada: ahora() })
            onClose()
          }}
          className="min-h-14 rounded-2xl bg-terra text-lg font-bold text-white"
        >
          Guardar
        </button>
        <button
          onClick={async () => {
            await pdb.notas.delete(nota.id)
            showUndo('Nota borrada', () => void pdb.notas.put(nota))
            onClose()
          }}
          className="min-h-14 rounded-2xl border-2 border-terra bg-white text-lg font-semibold text-terra"
        >
          Borrar
        </button>
      </div>
    </Sheet>
  )
}
