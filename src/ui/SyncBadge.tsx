import { useSyncStatus } from '../sync/EngineProvider'

/** Indicador discreto: ✓ si todo está guardado, aviso claro si no hay conexión. */
export function SyncBadge() {
  const s = useSyncStatus()
  const base = 'inline-flex h-9 shrink-0 items-center justify-center rounded-full text-sm font-bold whitespace-nowrap'
  if (!s.online) {
    return (
      <span className={`${base} bg-aviso-claro px-3 text-aviso`} role="status">
        Sin conexión{s.pending > 0 ? ` · ${s.pending}` : ''}
      </span>
    )
  }
  if (s.pending > 0) {
    return (
      <span className={`${base} w-9 bg-crema-oscuro text-gris`} role="status" aria-label="Guardando">
        <span aria-hidden className="animate-pulse">•••</span>
      </span>
    )
  }
  return (
    <span className={`${base} w-9 bg-oliva-claro text-lg text-oliva`} role="status" aria-label="Todo guardado">
      <span aria-hidden>✓</span>
    </span>
  )
}
