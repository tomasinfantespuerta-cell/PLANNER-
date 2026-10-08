import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Limpia la URL por si se pegó con espacios, sin https:// o con /rest/v1 al final. */
function limpiarUrl(raw: string | undefined): string | undefined {
  let u = raw?.trim().replace(/^["']|["']$/g, '')
  if (!u) return undefined
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u.replace(/\/(rest\/v1\/?)?$/, '').replace(/\/+$/, '')
}

const url = limpiarUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim().replace(/^["']|["']$/g, '')

export const DEMO_MODE = import.meta.env.VITE_DEMO === '1'

/** Si la configuración está mal, el planner sigue funcionando y la comida muestra el error. */
export let SUPABASE_ERROR: string | null = null

function crear(): SupabaseClient | null {
  if (!url || !anonKey) return null
  try {
    return createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'comidas-casa-auth' },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  } catch (e) {
    SUPABASE_ERROR = `${e instanceof Error ? e.message : String(e)} (URL leída: «${import.meta.env.VITE_SUPABASE_URL ?? ''}»)`
    console.error('[supabase]', e)
    return null
  }
}

export const supabase: SupabaseClient | null = crear()
export const SUPABASE_CONFIGURED = supabase !== null
