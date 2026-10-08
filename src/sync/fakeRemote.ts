import { PermanentError, TransientError, type Remote } from './remote'
import { compareTs } from './timestamps'
import type { AnyRow, TableName } from './types'

/**
 * Servidor simulado en memoria. Se usa en las pruebas y en el "modo demo".
 * Imita a Supabase: upsert idempotente por (household_id, id), updated_at
 * asignado por el servidor y un aviso "Realtime" a los suscriptores.
 */
export class FakeRemote implements Remote {
  private data = new Map<string, AnyRow>()
  private micros = Date.UTC(2026, 0, 1) * 1000
  private listeners = new Set<(table: TableName, row: AnyRow) => void>()

  /** Simula estar sin cobertura. */
  offline = false
  /** Aplica el cambio pero "se pierde la respuesta" (el cliente cree que falló). */
  loseNextResponses = 0
  /** Campos obligatorios al crear, para simular errores de validación. */
  required: Partial<Record<TableName, string[]>> = {}
  /** Se ejecuta tras guardar y antes de responder (para simular cambios "en vuelo"). */
  afterApply: (() => Promise<void> | void) | null = null
  /** Número de peticiones recibidas (para comprobar reintentos). */
  calls = 0

  /** Con storageKey (modo demo) los datos del "servidor" sobreviven a recargar. */
  constructor(private storageKey?: string) {
    if (!storageKey) return
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      if (saved) {
        this.data = new Map(saved.data)
        this.micros = saved.micros
      }
    } catch {
      /* sin datos guardados */
    }
  }

  private persist() {
    if (!this.storageKey) return
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ data: [...this.data], micros: this.micros }))
    } catch {
      /* sin almacenamiento */
    }
  }

  private key(table: TableName, householdId: unknown, id: unknown) {
    return `${table}|${String(householdId)}|${String(id)}`
  }

  private tick(): string {
    this.micros += 1 + Math.floor(Math.random() * 3)
    const ms = Math.floor(this.micros / 1000)
    const us = String(this.micros % 1000).padStart(3, '0')
    return new Date(ms).toISOString().replace('Z', `${us}+00:00`)
  }

  private guard() {
    this.calls++
    if (this.offline) throw new TransientError('Failed to fetch')
  }

  private async respond(table: TableName, row: AnyRow): Promise<AnyRow> {
    this.persist()
    this.listeners.forEach((fn) => fn(table, { ...row }))
    if (this.afterApply) {
      const hook = this.afterApply
      this.afterApply = null
      await hook()
    }
    if (this.loseNextResponses > 0) {
      this.loseNextResponses--
      throw new TransientError('Conexión cortada')
    }
    return { ...row }
  }

  async insert(table: TableName, row: Record<string, unknown>): Promise<AnyRow> {
    this.guard()
    for (const f of this.required[table] ?? []) {
      if (row[f] === undefined || row[f] === null || row[f] === '') {
        throw new PermanentError(`null value in column "${f}" violates not-null constraint`)
      }
    }
    const k = this.key(table, row.household_id, row.id)
    const prev = this.data.get(k)
    const now = this.tick()
    const saved = { ...(prev ?? {}), ...row, created_at: prev?.created_at ?? now, updated_at: now } as AnyRow
    this.data.set(k, saved)
    return this.respond(table, saved)
  }

  async update(
    table: TableName,
    householdId: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<AnyRow> {
    this.guard()
    const k = this.key(table, householdId, id)
    const prev = this.data.get(k)
    if (!prev) throw new PermanentError('La fila no existe en el servidor')
    const saved = { ...prev, ...patch, id, household_id: householdId, updated_at: this.tick() } as AnyRow
    this.data.set(k, saved)
    return this.respond(table, saved)
  }

  async pullSince(table: TableName, householdId: string, since: string | null): Promise<AnyRow[]> {
    this.guard()
    const out: AnyRow[] = []
    for (const [k, row] of this.data) {
      if (!k.startsWith(`${table}|${householdId}|`)) continue
      if (since && compareTs(row.updated_at, since) < 0) continue
      out.push({ ...row })
    }
    return out.sort((a, b) => compareTs(a.updated_at, b.updated_at))
  }

  /** Simula Supabase Realtime. */
  onChange(fn: (table: TableName, row: AnyRow) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** Todas las filas de una tabla (para comprobar en las pruebas). */
  all(table: TableName, householdId: string): AnyRow[] {
    return [...this.data.entries()]
      .filter(([k]) => k.startsWith(`${table}|${householdId}|`))
      .map(([, r]) => ({ ...r }))
  }
}
