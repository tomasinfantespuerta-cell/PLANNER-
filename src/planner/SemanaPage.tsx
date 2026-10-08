import { useState } from 'react'
import { addDays, mondayOf, today } from '../lib/dates'
import { ListaBloques } from './Bloques'
import { Examenes } from './Examenes'
import { useExamenes } from './hooks'
import { cuentaAtras, diasHasta, examenCerca } from './logic'
import { DIAS, TIPOS, diaDeFecha, setModoExamenes, useModoExamenes } from './semana'

export function InterruptorExamenes() {
  const on = useModoExamenes()
  return (
    <button role="switch" aria-checked={on} onClick={() => setModoExamenes(!on)} className={`flex min-h-12 items-center gap-2 text-base font-bold ${on ? 'text-[#2952a3]' : 'text-gris'}`}>
      <span aria-hidden className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${on ? 'justify-end bg-[#2952a3]' : 'justify-start bg-borde'}`}>
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </span>
      Modo exámenes
    </button>
  )
}

/** Aviso si hay un examen cerca y el modo exámenes está apagado. */
export function AvisoExamen() {
  const on = useModoExamenes()
  const hoy = today()
  const ex = examenCerca(useExamenes() ?? [], hoy)
  if (on || !ex) return null
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-amarillo-claro p-4 text-base text-aviso">
      <p>
        📚 Tienes <strong>{ex.titulo}</strong> {cuentaAtras(diasHasta(ex.fecha, hoy))}. ¿Activas el modo exámenes?
      </p>
      <button onClick={() => setModoExamenes(true)} className="min-h-12 self-start rounded-xl bg-white px-4 font-bold text-[#2952a3]">
        Activar modo exámenes
      </button>
    </div>
  )
}

export function SemanaPage() {
  const hoy = today()
  const hoyIdx = diaDeFecha(hoy)
  const [actual, setActual] = useState(hoyIdx)
  const examenes = useModoExamenes()
  const d = DIAS[actual]
  const fecha = addDays(mondayOf(hoy), actual)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-base text-gris">Bloques grandes. El detalle lo decides cada día.</p>
        <InterruptorExamenes />
      </header>

      <AvisoExamen />

      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Días de la semana">
        {DIAS.map((dia, i) => {
          const sel = i === actual
          return (
            <button
              key={dia.s}
              role="tab"
              aria-selected={sel}
              onClick={() => setActual(i)}
              className={`flex flex-col items-center gap-0.5 rounded-xl border-2 pt-2 pb-1.5 text-lg font-bold ${
                sel ? 'border-tinta bg-tinta text-crema' : 'border-borde bg-white'
              }`}
            >
              {dia.s}
              <small className={`text-[0.6rem] font-medium tracking-wide uppercase ${sel ? 'opacity-75' : 'text-gris'}`}>{dia.name.slice(0, 3)}</small>
              <span className={`h-1.5 w-1.5 rounded-full ${i === hoyIdx ? (sel ? 'bg-crema' : 'bg-terra') : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-extrabold">
          {d.name}
          {actual === hoyIdx ? ' · hoy' : ''}
        </h2>
        <span className="rounded-full border-2 border-borde bg-white px-3 py-0.5 text-sm font-semibold text-gris">{d.tag}</span>
      </div>

      <ListaBloques dia={actual} fecha={fecha} hoy={hoy} examenes={examenes} />

      <div className="flex flex-wrap gap-1.5 border-t-2 border-borde pt-3">
        {Object.entries(TIPOS).map(([k, t]) => (
          <span key={k} className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: t.bg, color: t.ink }}>
            {t.label}
          </span>
        ))}
      </div>
      <p className="text-sm text-gris">
        Trabajo = tus proyectos de IA y personales. Campo = tareas del campo. Los bloques marcados como "según semana" cambian a estudio con el modo exámenes.
        Pulsa un bloque para ver y añadir sus subbloques.
      </p>

      <Examenes />
    </div>
  )
}
