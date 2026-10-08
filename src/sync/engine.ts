import type { LocalDB } from './db'
import { PermanentError, type Remote } from './remote'
import { compareTs, tsToMicros } from './timestamps'
import { TABLES, type AnyRow, type Mutation, type OutboxEntry, type TableName } from './types'

export interface SyncStatus {
  /** Hay cambios pendientes de enviar. */
  pending: number
  /** Cambios que el servidor rechazó (se guardan aparte, nunca se pierden en silencio). */
  dead: number
  syncing: boolean
  /** false cuando el último intento falló por falta de red. */
  online: boolean
  lastError: string | null
  lastSyncedAt: string | null
}

export interface EngineOptions {
  /** Programar sincronizaciones automáticamente tras cada cambio (desactivado en pruebas). */
  autoSync?: boolean
  /** Margen al descargar cambios, para no perder filas confirmadas fuera de orden. */
  pullOverlapMs?: number
  now?: () => Date
}

const CURSOR_KEY = (t: TableName) => `cursor:${t}`

/**
 * Motor de sincronización "offline-first":
 *  1. Cada cambio se escribe primero en IndexedDB (fila + entrada en outbox) en
 *     una única transacción. Si la app se cierra, el cambio sigue ahí.
 *  2. flush() envía la outbox al servidor en orden. Los ids se generan en el
 *     móvil, así que reintentar un envío nunca duplica nada.
 *  3. pull() descarga lo que ha cambiado en el servidor; Realtime llama a
 *     applyRemote() con cada cambio del otro móvil.
 *  4. Al mezclar datos remotos, los cambios locales aún no enviados se aplican
 *     encima, así la pantalla nunca "salta atrás".
 */
export class SyncEngine {
  private listeners = new Set<() => void>()
  private status: SyncStatus = {
    pending: 0,
    dead: 0,
    syncing: false,
    online: true,
    lastError: null,
    lastSyncedAt: null,
  }
  private running: Promise<void> | null = null
  private needFlush = false
  private needPull = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private backoffMs = 0
  private disposed = false
  private readonly autoSync: boolean
  private readonly pullOverlapMs: number
  private readonly now: () => Date

  constructor(
    readonly db: LocalDB,
    readonly remote: Remote,
    readonly householdId: string,
    opts: EngineOptions = {},
  ) {
    this.autoSync = opts.autoSync ?? true
    this.pullOverlapMs = opts.pullOverlapMs ?? 2 * 60 * 1000
    this.now = opts.now ?? (() => new Date())
    void this.refreshCounts()
  }

  // ---------------------------------------------------------------- estado

  getStatus = (): SyncStatus => this.status

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private setStatus(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch }
    this.listeners.forEach((fn) => fn())
  }

  private async refreshCounts() {
    const [pending, dead] = await Promise.all([this.db.outbox.count(), this.db.dead.count()])
    if (pending !== this.status.pending || dead !== this.status.dead) this.setStatus({ pending, dead })
  }

  dispose() {
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    this.listeners.clear()
  }

  // ---------------------------------------------------------------- cambios locales

  insert(table: TableName, row: Record<string, unknown> & { id: string }) {
    return this.mutate([{ table, id: row.id, op: 'insert', patch: row }])
  }

  update(table: TableName, id: string, patch: Record<string, unknown>) {
    return this.mutate([{ table, id, op: 'update', patch }])
  }

  remove(table: TableName, id: string) {
    return this.update(table, id, { deleted_at: this.now().toISOString() })
  }

  restore(table: TableName, id: string) {
    return this.update(table, id, { deleted_at: null })
  }

  /** Aplica varios cambios de forma atómica (todos o ninguno). */
  async mutate(mutations: Mutation[]): Promise<void> {
    if (mutations.length === 0) return
    const tables = [...new Set(mutations.map((m) => m.table))].map((t) => this.db.rows(t))
    await this.db.transaction('rw', [...tables, this.db.outbox], async () => {
      for (const m of mutations) {
        const patch = { ...m.patch }
        delete patch.id
        delete patch.household_id
        delete patch.updated_at
        delete patch.created_at

        const store = this.db.rows(m.table)
        const local = await store.get(m.id)
        if (!local && m.op === 'update') continue // no existe: nada que cambiar
        await store.put({ ...(local ?? {}), ...patch, id: m.id, household_id: this.householdId } as AnyRow)

        const existing = await this.db.outbox.where('[table+rowId]').equals([m.table, m.id]).first()
        if (existing) {
          await this.db.outbox.update(existing.seq!, {
            patch: { ...existing.patch, ...patch },
            version: existing.version + 1,
            op: existing.op === 'insert' || m.op === 'insert' ? 'insert' : 'update',
          })
        } else {
          await this.db.outbox.add({
            table: m.table,
            rowId: m.id,
            op: m.op,
            patch,
            version: 1,
            createdAt: this.now().toISOString(),
          })
        }
      }
    })
    await this.refreshCounts()
    this.requestSync({ flush: true })
  }

  // ---------------------------------------------------------------- sincronización

  /** Pide una sincronización (agrupa peticiones seguidas). */
  requestSync(what: { flush?: boolean; pull?: boolean } = { flush: true, pull: true }) {
    if (what.flush) this.needFlush = true
    if (what.pull) this.needPull = true
    if (!this.autoSync || this.disposed) return
    this.schedule(this.backoffMs || 150)
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.sync({ flush: false, pull: false })
    }, ms)
  }

  /**
   * Envía lo pendiente y descarga lo nuevo. Nunca corre dos veces a la vez:
   * si se pide mientras está en marcha, se repite al terminar.
   */
  sync(what: { flush?: boolean; pull?: boolean } = {}): Promise<void> {
    if (what.flush ?? true) this.needFlush = true
    if (what.pull ?? true) this.needPull = true
    if (this.running) return this.running
    this.running = (async () => {
      this.setStatus({ syncing: true })
      try {
        while ((this.needFlush || this.needPull) && !this.disposed) {
          const doPull = this.needPull
          this.needFlush = false
          this.needPull = false
          const flushed = await this.flush()
          if (!flushed) break
          if (doPull) {
            const pulled = await this.pull()
            if (!pulled) break
          }
        }
      } finally {
        this.running = null
        this.setStatus({ syncing: false })
      }
    })()
    return this.running
  }

  private onTransientError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    this.backoffMs = Math.min(this.backoffMs ? this.backoffMs * 2 : 2000, 60_000)
    this.setStatus({ online: false, lastError: msg })
    // Volveremos a intentarlo; lo que había pendiente sigue pendiente.
    this.needFlush = true
    this.needPull = true
    if (this.autoSync && !this.disposed) this.schedule(this.backoffMs)
  }

  private onSuccess() {
    this.backoffMs = 0
    this.setStatus({ online: true, lastError: null })
  }

  /** Envía la outbox en orden. Devuelve false si se cortó por un error temporal. */
  async flush(): Promise<boolean> {
    for (;;) {
      if (this.disposed) return false
      const entry = await this.db.outbox.orderBy('seq').first()
      if (!entry) break

      let saved: AnyRow
      try {
        const payload = { ...entry.patch, id: entry.rowId, household_id: this.householdId }
        saved =
          entry.op === 'insert'
            ? await this.remote.insert(entry.table, payload)
            : await this.remote.update(entry.table, this.householdId, entry.rowId, entry.patch)
      } catch (err) {
        if (err instanceof PermanentError) {
          await this.db.transaction('rw', this.db.outbox, this.db.dead, async () => {
            await this.db.outbox.delete(entry.seq!)
            const { seq: _seq, ...rest } = entry
            await this.db.dead.add({ ...rest, error: err.message, failedAt: this.now().toISOString() })
          })
          console.error('[sync] Cambio rechazado por el servidor', entry, err)
          await this.refreshCounts()
          continue
        }
        this.onTransientError(err)
        await this.refreshCounts()
        return false
      }

      await this.db.transaction('rw', [this.db.rows(entry.table), this.db.outbox], async () => {
        const current = await this.db.outbox.get(entry.seq!)
        // Si mientras enviábamos se añadió otro cambio a esta fila, la entrada se
        // queda (con todo fusionado) y se enviará en la siguiente vuelta.
        if (current && current.version === entry.version) {
          await this.db.outbox.delete(entry.seq!)
        } else if (current && current.op === 'insert') {
          await this.db.outbox.update(entry.seq!, { op: 'update' })
        }
        await this.applyRemoteInTx(entry.table, saved)
      })
      this.onSuccess()
      await this.refreshCounts()
    }
    this.onSuccess()
    return true
  }

  /** Descarga cambios del servidor. Devuelve false si falló por red. */
  async pull(): Promise<boolean> {
    try {
      for (const table of TABLES) {
        const cursor = await this.db.getMeta<string>(CURSOR_KEY(table))
        const since = cursor
          ? new Date(Math.floor(tsToMicros(cursor) / 1000) - this.pullOverlapMs).toISOString()
          : null
        const rows = await this.remote.pullSince(table, this.householdId, since)
        let max = cursor ?? null
        for (const row of rows) {
          await this.applyRemote(table, row)
          if (compareTs(row.updated_at, max) > 0) max = row.updated_at ?? max
        }
        if (max && max !== cursor) await this.db.setMeta(CURSOR_KEY(table), max)
      }
    } catch (err) {
      if (err instanceof PermanentError) {
        this.setStatus({ lastError: err.message })
        return false
      }
      this.onTransientError(err)
      return false
    }
    await this.db.setMeta('pulled', this.now().toISOString())
    this.onSuccess()
    this.setStatus({ lastSyncedAt: this.now().toISOString() })
    return true
  }

  /** true si alguna vez se descargó todo del servidor (la copia local está completa). */
  async hasPulledOnce(): Promise<boolean> {
    return Boolean(await this.db.getMeta<string>('pulled'))
  }

  /** Mezcla una fila que viene del servidor (pull o Realtime). */
  async applyRemote(table: TableName, row: AnyRow): Promise<void> {
    await this.db.transaction('rw', [this.db.rows(table), this.db.outbox], () =>
      this.applyRemoteInTx(table, row),
    )
  }

  private async applyRemoteInTx(table: TableName, row: AnyRow): Promise<void> {
    if (!row || row.household_id !== this.householdId) return
    const store = this.db.rows(table)
    const local = await store.get(row.id)
    // Nunca retroceder a una versión más antigua de la que ya tenemos.
    if (local && compareTs(local.updated_at, row.updated_at) > 0) return
    const pending = await this.db.outbox.where('[table+rowId]').equals([table, row.id]).first()
    await store.put(pending ? ({ ...row, ...pending.patch } as AnyRow) : row)
  }

  // ---------------------------------------------------------------- utilidades

  /** Cambios que el servidor rechazó, para mostrarlos o reintentarlos. */
  listDead() {
    return this.db.dead.toArray()
  }

  /** Vuelve a poner en cola los cambios rechazados. */
  async retryDead(): Promise<void> {
    const dead = await this.db.dead.toArray()
    if (dead.length === 0) return
    await this.mutate(
      dead.map((d: OutboxEntry) => ({ table: d.table, id: d.rowId, op: d.op, patch: d.patch })),
    )
    await this.db.dead.clear()
    await this.refreshCounts()
  }
}
