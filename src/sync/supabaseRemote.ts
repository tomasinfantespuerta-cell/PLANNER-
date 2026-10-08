import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { PermanentError, TransientError, type Remote } from './remote'
import type { AnyRow, TableName } from './types'

const PAGE = 1000

/** Decide si un error de Supabase merece reintentarse o no. */
export function classifyError(error: Partial<PostgrestError> | null, status: number): Error {
  const code = error?.code ?? ''
  const msg = error?.message || `Error ${status}`
  // Sin red, servidor caído, sesión caducada o sin permiso (se recupera al reconectar).
  if (status === 0 || status >= 500 || [401, 403, 408, 425, 429].includes(status)) return new TransientError(msg)
  if (code === '' || code === '42501' || code.startsWith('PGRST3')) return new TransientError(msg)
  // Datos inválidos: reintentar no sirve.
  return new PermanentError(msg)
}

export class SupabaseRemote implements Remote {
  constructor(private client: SupabaseClient) {}

  private wrap(err: unknown): Error {
    if (err instanceof TransientError || err instanceof PermanentError) return err
    return new TransientError(err instanceof Error ? err.message : String(err))
  }

  async insert(table: TableName, row: Record<string, unknown>): Promise<AnyRow> {
    try {
      const { data, error, status } = await this.client
        .from(table)
        .upsert(row, { onConflict: 'household_id,id' })
        .select()
        .single()
      if (error) throw classifyError(error, status)
      return data as AnyRow
    } catch (err) {
      throw this.wrap(err)
    }
  }

  async update(
    table: TableName,
    householdId: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<AnyRow> {
    try {
      const { data, error, status } = await this.client
        .from(table)
        .update(patch)
        .eq('household_id', householdId)
        .eq('id', id)
        .select()
        .maybeSingle()
      if (error) throw classifyError(error, status)
      if (data) return data as AnyRow

      // 0 filas: o la fila no existe, o no tenemos permiso (sesión perdida).
      const check = await this.client.from('households').select('id').eq('id', householdId).maybeSingle()
      if (check.error) throw classifyError(check.error, check.status)
      if (check.data) throw new PermanentError('La fila no existe en el servidor')
      throw new TransientError('Sin permiso: reconectando con la casa')
    } catch (err) {
      throw this.wrap(err)
    }
  }

  async pullSince(table: TableName, householdId: string, since: string | null): Promise<AnyRow[]> {
    try {
      const out: AnyRow[] = []
      for (let from = 0; ; from += PAGE) {
        let q = this.client.from(table).select('*').eq('household_id', householdId)
        if (since) q = q.gte('updated_at', since)
        const { data, error, status } = await q
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) throw classifyError(error, status)
        out.push(...((data ?? []) as AnyRow[]))
        if (!data || data.length < PAGE) break
      }
      return out
    } catch (err) {
      throw this.wrap(err)
    }
  }
}
