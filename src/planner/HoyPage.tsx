import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { daysByDate, dishLabel } from '../features/menu/logic'
import { useMenuDays, useRecipes } from '../features/recipes/hooks'
import { addDays, formatShortDate, today, weekdayName } from '../lib/dates'
import { usePersonalEnabled } from '../lib/personal'
import { useHasEngine } from '../sync/EngineProvider'
import { useFeedback } from '../ui/feedback'
import { ListaBloques } from './Bloques'
import { pdb, type Tarea } from './db'
import { marcarTarea, nuevaTarea, useExamenes, useTareas } from './hooks'
import { cuentaAtras, diasHasta, fmtDinero, mesKey, proximosExamenes, suma, tareasDeHoy } from './logic'
import { AvisoExamen, InterruptorExamenes } from './SemanaPage'
import { DIAS, GYM_URL, diaDeFecha, esDiaDeGym, useModoExamenes } from './semana'
import { AddBar, FilaCheck, Seccion, Vacio, card } from './ui'

export function HoyPage({ go }: { go: (path: string) => void }) {
  const hoy = today()
  const dia = diaDeFecha(hoy)
  const examenes = useModoExamenes()
  const hasEngine = useHasEngine()
  const proximos = proximosExamenes(useExamenes() ?? [], hoy).filter((e) => diasHasta(e.fecha, hoy) <= 14)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-extrabold">
            {weekdayName(hoy)}, {formatShortDate(hoy)}
          </p>
          <p className="text-base text-gris">{DIAS[dia].tag}</p>
        </div>
        <InterruptorExamenes />
      </div>

      <AvisoExamen />

      {proximos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {proximos.map((e) => (
            <button key={e.id} onClick={() => go('semana')} className="rounded-full bg-terra-claro px-3 py-1.5 text-base font-semibold text-terra-oscuro">
              {e.tipo === 'examen' ? '📚' : '📝'} {e.titulo} · {cuentaAtras(diasHasta(e.fecha, hoy))}
            </button>
          ))}
        </div>
      )}

      {esDiaDeGym(dia) && (
        <a
          href={GYM_URL}
          className="flex min-h-16 items-center justify-between rounded-3xl border-2 border-[#f3b9ae] bg-[#ffe1dc] px-5 text-lg font-extrabold text-[#a3392a]"
        >
          <span>🏋️ Hoy toca gym</span>
          <span className="shrink-0">Abrir ›</span>
        </a>
      )}

      <TareasHoy hoy={hoy} />

      {hasEngine ? (
        <ComidaHoy hoy={hoy} go={go} />
      ) : (
        <Seccion titulo="🍽️ Comida de hoy">
          <button onClick={() => go('menu')} className={`${card} text-left text-base text-gris`}>
            Conecta la comida con tu código de casa para ver aquí el menú de hoy ›
          </button>
        </Seccion>
      )}

      <Seccion titulo="🗓️ Mi horario de hoy" extra={<span className="text-sm text-gris">Pulsa un bloque</span>}>
        <ListaBloques dia={dia} fecha={hoy} hoy={hoy} examenes={examenes} />
      </Seccion>

      <ResumenDinero go={go} />
    </div>
  )
}

function origen(t: Tarea, hoy: string): string | null {
  if (!t.fecha || t.fecha === hoy) return null
  if (t.fecha === addDays(hoy, -1)) return 'De ayer'
  return `Del ${weekdayName(t.fecha).toLowerCase()} ${formatShortDate(t.fecha)}`
}

function TareasHoy({ hoy }: { hoy: string }) {
  const tareas = tareasDeHoy(useTareas() ?? [], hoy)
  const { showUndo } = useFeedback()
  const hechas = tareas.filter((t) => t.hecha).length

  const borrar = async (t: Tarea) => {
    await pdb.tareas.delete(t.id)
    showUndo('Tarea borrada', () => void pdb.tareas.put(t))
  }

  return (
    <Seccion titulo="✅ Tareas de hoy" extra={tareas.length > 0 && <span className="text-sm font-semibold text-gris">{hechas}/{tareas.length}</span>}>
      <AddBar placeholder="¿Qué tienes que hacer hoy?" onAdd={(t) => nuevaTarea(t, hoy)} />
      <div className={card}>
        {tareas.length ? (
          <ul>
            {tareas.map((t) => {
              const o = origen(t, hoy)
              return (
                <FilaCheck
                  key={t.id}
                  hecho={t.hecha}
                  texto={t.texto}
                  onToggle={() => void marcarTarea(t.id, !t.hecha)}
                  sub={o && <p className="text-sm font-semibold text-aviso">↪ {o}</p>}
                >
                  {!t.hecha && (
                    <button
                      onClick={() => void pdb.tareas.update(t.id, { fecha: null })}
                      aria-label={`Pasar ${t.texto} a pendientes`}
                      title="Pasar a pendientes"
                      className="h-12 w-10 shrink-0 text-lg"
                    >
                      📌
                    </button>
                  )}
                  <button onClick={() => void borrar(t)} aria-label={`Borrar ${t.texto}`} className="h-12 w-10 shrink-0 text-lg text-gris">
                    ✕
                  </button>
                </FilaCheck>
              )
            })}
          </ul>
        ) : (
          <Vacio>Nada apuntado para hoy. Lo que no termines pasa solo a mañana.</Vacio>
        )}
      </div>
    </Seccion>
  )
}

function ComidaHoy({ hoy, go }: { hoy: string; go: (path: string) => void }) {
  const days = useMenuDays()
  const recipes = useRecipes()
  const personal = usePersonalEnabled()
  const recipeMap = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const familia = dishLabel(daysByDate(days ?? [], 'familia').get(hoy), recipeMap)
  const mio = personal ? dishLabel(daysByDate(days ?? [], 'yo').get(hoy), recipeMap) : null

  return (
    <Seccion titulo="🍽️ Comida de hoy">
      <div className="grid gap-2">
        <button onClick={() => go('menu')} className="flex items-center justify-between gap-2 rounded-3xl border-2 border-borde bg-[#fde8d4] p-4 text-left">
          <span>
            <span className="block text-sm font-bold text-[#9a5418]">Menú de casa</span>
            <span className="text-lg font-bold">{familia ?? 'Sin plato puesto'}</span>
          </span>
          <span className="text-xl text-[#9a5418]">›</span>
        </button>
        {personal && (
          <button onClick={() => go('yo')} className="flex items-center justify-between gap-2 rounded-3xl border-2 border-borde bg-oliva-claro p-4 text-left">
            <span>
              <span className="block text-sm font-bold text-oliva">Mi menú</span>
              <span className="text-lg font-bold">{mio ?? 'Sin plato puesto'}</span>
            </span>
            <span className="text-xl text-oliva">›</span>
          </button>
        )}
      </div>
    </Seccion>
  )
}

function ResumenDinero({ go }: { go: (path: string) => void }) {
  const key = mesKey(new Date())
  const mes = useLiveQuery(() => pdb.meses.get(key), [key])
  if (!mes) return null
  const disponible = suma(mes.ingresos) - suma(mes.gastosFijos) - suma(mes.gastosVariables)
  return (
    <button onClick={() => go('dinero')} className="flex items-center justify-between gap-2 rounded-3xl border-2 border-borde bg-amarillo-claro p-4 text-left">
      <span>
        <span className="block text-sm font-bold text-gris">💶 Te queda este mes</span>
        <span className={`text-2xl font-extrabold tabular-nums ${disponible < 0 ? 'text-[#a6402c]' : 'text-oliva'}`}>{fmtDinero(disponible)}</span>
      </span>
      <span className="text-xl text-gris">›</span>
    </button>
  )
}
