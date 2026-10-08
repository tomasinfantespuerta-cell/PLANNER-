import { useState } from 'react'
import { setPersonalEnabled, usePersonalEnabled } from '../../lib/personal'
import { useEngine, useHousehold, useSyncStatus } from '../../sync/EngineProvider'
import { useFeedback } from '../../ui/feedback'

function formatTime(iso: string | null) {
  if (!iso) return 'todavía no'
  return new Date(iso).toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
}

export function SettingsPage({ onLeave }: { onLeave: () => void }) {
  const household = useHousehold()
  const engine = useEngine()
  const status = useSyncStatus()
  const { confirm, showInfo } = useFeedback()
  const [syncing, setSyncing] = useState(false)
  const personal = usePersonalEnabled()

  const share = async () => {
    const text = `Código de casa para la app Comidas de casa: ${household.code}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Comidas de casa', text, url: location.origin })
        return
      }
      await navigator.clipboard.writeText(household.code)
      showInfo('Código copiado')
    } catch {
      /* cancelado */
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    await engine.sync()
    setSyncing(false)
    showInfo(engine.getStatus().online ? 'Todo al día ✓' : 'Sin conexión: se enviará al volver la cobertura')
  }

  const leave = async () => {
    const pendingMsg =
      status.pending > 0 ? ` ¡Atención! Hay ${status.pending} cambios sin enviar que se perderán.` : ''
    const ok = await confirm({
      title: '¿Salir de esta casa?',
      message: `Este móvil dejará de ver la lista y el menú. Los datos siguen guardados para los demás y puedes volver a entrar con el código.${pendingMsg}`,
      confirmLabel: 'Sí, salir',
      danger: true,
    })
    if (ok) onLeave()
  }

  const card = 'rounded-3xl border-2 border-borde bg-white p-5'
  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <h2 className="text-lg font-bold">Código de casa</h2>
        <p className="mt-1 text-base text-gris">Quien lo escriba en su móvil verá y editará los mismos datos.</p>
        <p className="mt-3 rounded-2xl bg-crema p-4 text-center text-2xl font-extrabold break-words text-terra-oscuro select-all">
          {household.code}
        </p>
        <button onClick={share} className="mt-3 min-h-14 w-full rounded-2xl bg-terra text-lg font-bold text-white">
          Compartir código
        </button>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">🥗 Mi sección personal</h2>
        <p className="mt-1 text-base text-gris">
          Añade abajo la pestaña «Yo», con tu menú y tu lista de la compra. Solo aparece en este móvil.
        </p>
        <button
          role="switch"
          aria-checked={personal}
          onClick={() => setPersonalEnabled(!personal)}
          className={`mt-3 flex min-h-14 w-full items-center justify-between rounded-2xl border-2 px-4 text-lg font-bold ${
            personal ? 'border-oliva bg-oliva-claro text-oliva' : 'border-borde bg-white'
          }`}
        >
          <span>{personal ? 'Activada en este móvil' : 'Activar en este móvil'}</span>
          <span aria-hidden className={`flex h-8 w-14 items-center rounded-full p-1 ${personal ? 'justify-end bg-oliva' : 'justify-start bg-borde'}`}>
            <span className="h-6 w-6 rounded-full bg-white shadow" />
          </span>
        </button>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Sincronización</h2>
        <ul className="mt-2 flex flex-col gap-1 text-base">
          <li>Estado: {status.online ? <strong className="text-oliva">conectado</strong> : <strong className="text-aviso">sin conexión</strong>}</li>
          <li>Cambios por enviar: <strong>{status.pending}</strong></li>
          <li>Última actualización: {formatTime(status.lastSyncedAt)}</li>
        </ul>
        {status.dead > 0 && (
          <div className="mt-3 rounded-2xl bg-aviso-claro p-3 text-base text-aviso">
            Hay {status.dead} cambios que el servidor no aceptó.
            <button onClick={() => void engine.retryDead()} className="ml-2 font-bold underline">
              Reintentar
            </button>
          </div>
        )}
        <button
          onClick={syncNow}
          disabled={syncing}
          className="mt-3 min-h-14 w-full rounded-2xl border-2 border-borde text-lg font-semibold disabled:opacity-60"
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Instalar en el móvil</h2>
        <p className="mt-2 text-base">
          <strong>Android (Chrome):</strong> menú <span aria-hidden>⋮</span> → «Añadir a pantalla de inicio» o «Instalar aplicación».
        </p>
        <p className="mt-2 text-base">
          <strong>iPhone (Safari):</strong> botón compartir <span aria-hidden>⬆️</span> → «Añadir a pantalla de inicio».
        </p>
      </section>

      <button onClick={leave} className="min-h-14 rounded-2xl border-2 border-terra bg-white text-lg font-semibold text-terra">
        Salir de esta casa
      </button>
    </div>
  )
}
