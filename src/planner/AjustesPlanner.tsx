import { useRef } from 'react'
import { today } from '../lib/dates'
import { useFeedback } from '../ui/feedback'
import { exportar, importar } from './db'
import { GYM_URL } from './semana'
import { card } from './ui'

/** Ajustes del planner: copia de seguridad e instalación. */
export function AjustesPlanner() {
  const { showInfo, confirm } = useFeedback()
  const file = useRef<HTMLInputElement>(null)

  const descargar = async () => {
    const blob = new Blob([await exportar()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `planner-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    showInfo('Copia descargada ✓')
  }

  const restaurar = async (f: File) => {
    const ok = await confirm({
      title: '¿Restaurar esta copia?',
      message: 'Se sustituyen tus tareas, listas, notas, exámenes, subbloques y dinero por los de la copia. La comida no se toca.',
      confirmLabel: 'Restaurar',
      danger: true,
    })
    if (!ok) return
    try {
      await importar(await f.text())
      showInfo('Copia restaurada ✓')
    } catch (e) {
      showInfo(e instanceof Error ? e.message : 'No se pudo leer el archivo')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <h2 className="text-lg font-bold">💾 Copia de seguridad</h2>
        <p className="mt-1 text-base text-gris">
          Tus tareas, listas, notas, exámenes, subbloques y dinero se guardan en este móvil. Descarga una copia de vez en cuando por si cambias de móvil o se borra el
          navegador.
        </p>
        <button onClick={() => void descargar()} className="mt-3 min-h-14 w-full rounded-2xl bg-terra text-lg font-bold text-white">
          Descargar copia
        </button>
        <button onClick={() => file.current?.click()} className="mt-2 min-h-14 w-full rounded-2xl border-2 border-borde bg-white text-lg font-semibold">
          Restaurar una copia
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void restaurar(f)
          }}
        />
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">🏋️ App del gimnasio</h2>
        <p className="mt-1 text-base text-gris">Sigue siendo una app aparte. Los días de gym tienes el acceso directo en «Hoy».</p>
        <a href={GYM_URL} className="mt-3 flex min-h-14 items-center justify-center rounded-2xl border-2 border-borde bg-white text-lg font-semibold">
          Abrir la app del gym
        </a>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">📲 Instalar en el móvil</h2>
        <p className="mt-2 text-base">
          <strong>Android (Chrome):</strong> menú <span aria-hidden>⋮</span> → «Añadir a pantalla de inicio» o «Instalar aplicación».
        </p>
        <p className="mt-2 text-base">
          <strong>iPhone (Safari):</strong> botón compartir <span aria-hidden>⬆️</span> → «Añadir a pantalla de inicio».
        </p>
      </section>
    </div>
  )
}
