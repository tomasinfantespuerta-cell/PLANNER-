import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { useFeedback } from '../ui/feedback'
import { pdb, type Subbloque } from './db'
import { borrarSubbloque, marcarSubbloque, nuevoSubbloque, useChecks, useSubbloques } from './hooks'
import { checkId, checksSet, racha } from './logic'
import { DIAS, TIPOS, bloqueKey, vistaBloque, type Bloque } from './semana'
import { Circulo } from './ui'

/** Días que tienen un bloque igual (mismo nombre y tipo), para copiar subbloques. */
function bloquesGemelos(b: Bloque): string[] {
  const out: string[] = []
  DIAS.forEach((d, i) => d.blocks.forEach((x) => x.name === b.name && x.type === b.type && out.push(bloqueKey(i, x))))
  return out
}

/** Lista de bloques de un día. Al pulsar un bloque se abren sus subbloques. */
export function ListaBloques({ dia, fecha, hoy, examenes }: { dia: number; fecha: string; hoy: string; examenes: boolean }) {
  const subs = useSubbloques() ?? []
  const checks = checksSet(useChecks() ?? [])
  const [abierto, setAbierto] = useState<string | null>(null)

  return (
    <ul className="flex flex-col gap-2">
      {DIAS[dia].blocks.map((b) => {
        const key = bloqueKey(dia, b)
        const v = vistaBloque(b, examenes)
        const tipo = TIPOS[v.type]
        const mios = subs.filter((s) => s.bloque === key).sort((a, c) => a.orden - c.orden)
        const hechos = mios.filter((s) => checks.has(checkId(s.id, fecha))).length
        const open = abierto === key
        return (
          <li key={key} className="grid grid-cols-[3.4rem_1fr] gap-2">
            <div className="pt-3 text-right text-sm font-semibold text-gris tabular-nums">{b.t}</div>
            <div className="min-w-0 overflow-hidden rounded-2xl" style={{ background: tipo.bg, color: tipo.ink }}>
              <button onClick={() => setAbierto(open ? null : key)} aria-expanded={open} className="flex w-full items-start gap-2 px-4 py-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    {v.name}
                    {b.flex && <span className="rounded-full border border-current px-2 text-xs font-semibold tracking-wide uppercase opacity-80">según semana</span>}
                  </div>
                  {v.note && <div className="text-base opacity-85">{v.note}</div>}
                </div>
                <span className="shrink-0 pt-1 text-sm font-bold opacity-80">
                  {mios.length > 0 && `${hechos}/${mios.length} `}
                  {open ? '▴' : '▾'}
                </span>
              </button>
              {open && <Subbloques bloque={b} bloqueK={key} subs={mios} todos={subs} checks={checks} fecha={fecha} hoy={hoy} />}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Subbloques({
  bloque,
  bloqueK,
  subs,
  todos,
  checks,
  fecha,
  hoy,
}: {
  bloque: Bloque
  bloqueK: string
  subs: Subbloque[]
  todos: Subbloque[]
  checks: Set<string>
  fecha: string
  hoy: string
}) {
  const [texto, setTexto] = useState('')
  const [habito, setHabito] = useState(false)
  const gemelos = bloquesGemelos(bloque)
  const [enTodos, setEnTodos] = useState(gemelos.length > 1)
  const [editando, setEditando] = useState<Subbloque | null>(null)

  const anadir = async () => {
    const t = texto.trim()
    if (!t) return
    setTexto('')
    await nuevoSubbloque(enTodos ? gemelos : [bloqueK], t, habito)
  }

  return (
    <div className="border-t border-black/10 bg-white/60 px-2 pt-1 pb-3 text-tinta">
      {subs.length === 0 && <p className="px-2 py-2 text-base text-gris">Aún no hay subbloques. Añade los pasos de este bloque.</p>}
      <ul>
        {subs.map((s) => {
          const hecho = checks.has(checkId(s.id, fecha))
          const r = s.habito ? racha(s.texto, todos, checks, hoy) : 0
          return (
            <li key={s.id} className="flex min-h-12 items-center gap-1">
              <Circulo hecho={hecho} label={s.texto} onClick={() => void marcarSubbloque(s, fecha, !hecho)} />
              <span className={`min-w-0 flex-1 text-lg break-words ${hecho ? 'text-gris line-through' : ''}`}>{s.texto}</span>
              {s.habito && (
                <span className="shrink-0 rounded-full bg-amarillo px-2 py-0.5 text-sm font-bold text-aviso" title="Racha de días seguidos">
                  🔥 {r}
                </span>
              )}
              <button onClick={() => setEditando(s)} aria-label={`Editar ${s.texto}`} className="h-12 w-10 shrink-0 text-lg">
                ✏️
              </button>
            </li>
          )
        })}
      </ul>
      <form
        className="mt-2 flex flex-col gap-2 px-1"
        onSubmit={(e) => {
          e.preventDefault()
          void anadir()
        }}
      >
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nuevo subbloque…"
            className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-borde bg-white px-3 text-lg outline-none focus:border-terra"
          />
          <button type="submit" disabled={!texto.trim()} className="min-h-12 shrink-0 rounded-xl bg-terra px-3 font-bold text-white disabled:opacity-50">
            Añadir
          </button>
        </div>
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={habito} onChange={(e) => setHabito(e.target.checked)} className="h-5 w-5 accent-terra" />
          Es un hábito (cuenta racha 🔥)
        </label>
        {gemelos.length > 1 && (
          <label className="flex items-center gap-2 text-base">
            <input type="checkbox" checked={enTodos} onChange={(e) => setEnTodos(e.target.checked)} className="h-5 w-5 accent-terra" />
            Añadir en todos los días con «{bloque.name}» ({gemelos.length})
          </label>
        )}
      </form>
      {editando && <EditarSub sub={editando} onClose={() => setEditando(null)} />}
    </div>
  )
}

function EditarSub({ sub, onClose }: { sub: Subbloque; onClose: () => void }) {
  const [texto, setTexto] = useState(sub.texto)
  const [habito, setHabito] = useState(sub.habito)
  const { confirm } = useFeedback()

  const guardar = async () => {
    if (texto.trim()) await pdb.subbloques.update(sub.id, { texto: texto.trim(), habito })
    onClose()
  }
  const borrar = async () => {
    const ok = await confirm({ title: '¿Borrar este subbloque?', message: `«${sub.texto}» solo se borra de este día.`, confirmLabel: 'Borrar', danger: true })
    if (!ok) return
    await borrarSubbloque(sub.id)
    onClose()
  }

  return (
    <Sheet title="Editar subbloque" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-14 rounded-2xl border-2 border-borde bg-white px-4 text-lg outline-none focus:border-terra" />
        <label className="flex items-center gap-3 text-lg">
          <input type="checkbox" checked={habito} onChange={(e) => setHabito(e.target.checked)} className="h-6 w-6 accent-terra" />
          Es un hábito (cuenta racha 🔥)
        </label>
        <button onClick={guardar} className="min-h-14 rounded-2xl bg-terra text-lg font-bold text-white">
          Guardar
        </button>
        <button onClick={borrar} className="min-h-14 rounded-2xl border-2 border-terra bg-white text-lg font-semibold text-terra">
          Borrar
        </button>
      </div>
    </Sheet>
  )
}
