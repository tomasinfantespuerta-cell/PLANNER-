import { DEMO_MODE, supabase } from '../lib/supabase'

export interface Household {
  id: string
  code: string
  name: string
}

const KEY = 'comidas-casa.household'

export function loadHousehold(): Household | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Household) : null
  } catch {
    return null
  }
}

export function saveHousehold(h: Household) {
  localStorage.setItem(KEY, JSON.stringify(h))
}

export function clearHousehold() {
  localStorage.removeItem(KEY)
}

/** Mensaje entendible para errores al crear/unirse. */
function explain(err: unknown): Error {
  const e = err as { message?: string; code?: string }
  if (e?.code === 'P0002') return new Error('No existe ninguna casa con ese código. Revisa que esté bien escrito.')
  if (/anonymous/i.test(e?.message ?? '')) {
    return new Error('Falta activar el acceso anónimo en Supabase (Authentication → Sign In / Providers).')
  }
  if (/fetch|network/i.test(e?.message ?? '')) return new Error('No hay conexión. Inténtalo cuando tengas internet.')
  return new Error(e?.message || 'Algo ha fallado. Inténtalo de nuevo.')
}

/** Sesión anónima de Supabase (invisible para el usuario). */
async function ensureSession() {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function createHousehold(name: string): Promise<Household> {
  if (DEMO_MODE || !supabase) {
    return { id: 'demo', code: 'demo-casa-0000', name: name || 'Casa' }
  }
  try {
    await ensureSession()
    const { data, error } = await supabase.rpc('create_household', { p_name: name })
    if (error) throw error
    return data as Household
  } catch (err) {
    throw explain(err)
  }
}

export async function joinHousehold(code: string): Promise<Household> {
  if (DEMO_MODE || !supabase) {
    return { id: 'demo', code: code.trim().toLowerCase() || 'demo-casa-0000', name: 'Casa' }
  }
  try {
    await ensureSession()
    const { data, error } = await supabase.rpc('join_household', { p_code: code })
    if (error) throw error
    return data as Household
  } catch (err) {
    throw explain(err)
  }
}

/**
 * Al abrir la app: asegura la sesión y la pertenencia a la casa. Si el móvil
 * perdió la sesión (p. ej. se borraron datos del navegador) se recupera sola
 * con el código guardado. Sin conexión no hace nada: ya se reintentará.
 */
export async function reconnectHousehold(h: Household): Promise<void> {
  if (DEMO_MODE || !supabase) return
  await ensureSession()
  const { error } = await supabase.rpc('join_household', { p_code: h.code })
  if (error) throw error
}
