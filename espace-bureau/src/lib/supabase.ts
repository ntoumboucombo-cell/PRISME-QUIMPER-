// Client Supabase - prepare pour plus tard.
//
// Tant que VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ne sont pas renseignes,
// `isSupabaseConfigured` vaut false et l'application utilise le store mock.
// Le jour ou tu crees un projet Supabase, renseigne le .env : le client sera
// disponible ici sans rien changer ailleurs.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const forceMock = import.meta.env.VITE_USE_MOCK === 'true'

export const isSupabaseConfigured = Boolean(url && anonKey) && !forceMock

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null
