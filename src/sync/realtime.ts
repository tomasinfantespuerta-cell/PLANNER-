import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncEngine } from './engine'
import { TABLES, type AnyRow } from './types'

/** Escucha los cambios del otro móvil y los mete en la copia local. */
export function connectRealtime(client: SupabaseClient, engine: SyncEngine): () => void {
  const channel = client.channel(`casa-${engine.householdId}`)
  for (const table of TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `household_id=eq.${engine.householdId}` },
      (payload) => {
        const row = payload.new as AnyRow | undefined
        if (row && row.id) void engine.applyRemote(table, row)
      },
    )
  }
  channel.subscribe((status) => {
    // Al (re)conectar, descargamos por si nos perdimos algo mientras tanto.
    if (status === 'SUBSCRIBED') engine.requestSync({ flush: true, pull: true })
  })
  return () => {
    void client.removeChannel(channel)
  }
}
