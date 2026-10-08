import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { reconnectHousehold, type Household } from '../household/session'
import { DEMO_MODE, supabase } from '../lib/supabase'
import { LocalDB, localDbName } from './db'
import { SyncEngine } from './engine'
import { FakeRemote } from './fakeRemote'
import { connectRealtime } from './realtime'
import { SupabaseRemote } from './supabaseRemote'

interface EngineCtx {
  engine: SyncEngine
  household: Household
}

const Ctx = createContext<EngineCtx | null>(null)

function buildEngine(household: Household): SyncEngine {
  const db = new LocalDB(localDbName(household.id))
  const remote = !DEMO_MODE && supabase ? new SupabaseRemote(supabase) : new FakeRemote('comidas-casa.demo-servidor')
  return new SyncEngine(db, remote, household.id)
}

export function EngineProvider({ household, children }: { household: Household; children: ReactNode }) {
  const [engine] = useState(() => buildEngine(household))

  useEffect(() => {
    let alive = true
    const syncAll = () => engine.requestSync({ flush: true, pull: true })

    // 1) Sesión + casa; 2) enviar pendientes y descargar novedades.
    reconnectHousehold(household)
      .catch((err) => console.warn('[casa] sin conexión o sesión pendiente', err))
      .finally(() => alive && syncAll())

    const stopRealtime = !DEMO_MODE && supabase ? connectRealtime(supabase, engine) : () => {}
    const onVisible = () => document.visibilityState === 'visible' && syncAll()
    window.addEventListener('online', syncAll)
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(syncAll, 60_000)

    return () => {
      alive = false
      stopRealtime()
      window.removeEventListener('online', syncAll)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [engine, household])


  return <Ctx.Provider value={{ engine, household }}>{children}</Ctx.Provider>
}

export function useEngine(): SyncEngine {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useEngine fuera de EngineProvider')
  return ctx.engine
}

export function useHousehold(): Household {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useHousehold fuera de EngineProvider')
  return ctx.household
}

export function useSyncStatus() {
  const engine = useEngine()
  return useSyncExternalStore(engine.subscribe, engine.getStatus)
}

/** ¿Está conectada la comida (hay casa)? El resto del planner funciona sin ella. */
export function useHasEngine(): boolean {
  return useContext(Ctx) !== null
}
