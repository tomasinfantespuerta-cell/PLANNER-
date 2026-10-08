import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const DEMO_MODE = import.meta.env.VITE_DEMO === '1'
export const SUPABASE_CONFIGURED = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'comidas-casa-auth' },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null
