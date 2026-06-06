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

// Lien d'authentification ouvert par l'utilisateur (invitation ou mot de passe
// oublie). Supabase encode le type dans le fragment d'URL `#type=invite|recovery`,
// puis nettoie ce fragment des qu'il restaure la session : on le capture donc ICI,
// au chargement du module, avant que le client ne l'efface. Sert a afficher
// l'ecran « choisir mon mot de passe » a la premiere connexion (voir AuthContext).
export const initialAuthLinkType: 'invite' | 'recovery' | null = (() => {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const type = params.get('type')
  return type === 'invite' || type === 'recovery' ? type : null
})()

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null
