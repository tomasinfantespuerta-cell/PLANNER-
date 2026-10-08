import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Limpia la URL por si se pegó con espacios, sin https:// o con /rest/v1 al final. */
function limpiarUrl(raw: string | undefined): string | undefined {
  let u = raw?.replace(/[\s"']+/g, '')
  if (!u) return undefined
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u.replace(/\/(rest\/v1\/?)?$/, '').replace(/\/+$/, '')
}

// Las claves nunca llevan espacios ni saltos de línea: si se colaron al pegarla, fuera.
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.replace(/[\s"']+/g, '') || undefined

/** Las claves antiguas (eyJ…) llevan dentro el identificador del proyecto de Supabase. */
function refDeLaClave(key: string | undefined): string | null {
  try {
    const payload = key?.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { ref?: unknown }
    return typeof json.ref === 'string' && /^[a-z0-9]{10,40}$/.test(json.ref) ? json.ref : null
  } catch {
    return null
  }
}

/**
 * Dirección del servidor. Si la de Vercel no es la de un proyecto de Supabase
 * (p. ej. se pegó la del panel, supabase.com/dashboard/...), se usa la que va dentro de la clave.
 */
function elegirUrl(): string | undefined {
  const dada = limpiarUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
  const ref = refDeLaClave(anonKey)
  if (!ref) return dada
  const buena = `https://${ref}.supabase.co`
  try {
    const host = dada ? new URL(dada).hostname : ''
    if (host === `${ref}.supabase.co` || (host && !host.endsWith('supabase.co') && !host.endsWith('supabase.com'))) return dada
  } catch {
    /* URL inválida: usamos la de la clave */
  }
  return buena
}

const url = elegirUrl()
export const SUPABASE_HOST = (() => {
  try {
    return url ? new URL(url).hostname : ''
  } catch {
    return url ?? ''
  }
})()

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
