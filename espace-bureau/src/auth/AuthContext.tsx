// Contexte d'authentification.
//
// Deux implementations derriere une API unique (useAuth / can / user) :
//   - MOCK (localStorage)  : verifie email/mot de passe dans la table `accounts`,
//                            session gardee dans sessionStorage. Utilise tant que
//                            Supabase n'est pas configure.
//   - SUPABASE             : authentification reelle (supabase.auth). Le role et le
//                            nom affiche sont lus dans la table `profiles`.
//
// Le choix se fait automatiquement via `isSupabaseConfigured` : aucun composant
// n'a besoin de savoir quel backend est actif.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, UserAccount } from '@/types'
import { getTable, update as updateRow } from '@/lib/data/store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { roleHas, type Permission } from './permissions'

interface SessionUser {
  id: string
  email: string
  display_name: string
  role: Role
  member_id?: string | null
}

interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthContextValue {
  user: SessionUser | null
  /** true tant que la session Supabase n'est pas encore restauree (evite un flash de redirection). */
  loading: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  can: (permission: Permission) => boolean
  changePassword: (current: string, next: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SESSION_KEY = 'prisme-bureau-session'

// ----------------------------------------------------------------------------
//  BYPASS D'AUTHENTIFICATION (developpement uniquement)
//
//  Active avec VITE_AUTH_BYPASS=true dans .env.local : connecte automatiquement
//  un compte President sans passer par l'ecran de connexion.
//
//  /!\ Ce flag est DESACTIVE DE FORCE :
//        - dans toute build de production (import.meta.env.PROD), et
//        - des que Supabase est configure (on veut alors la vraie auth).
//      Impossible donc de l'activer par erreur sur le site mis en ligne.
//      Une banniere rouge s'affiche tant qu'il est actif pour eviter l'oubli.
// ----------------------------------------------------------------------------
export const AUTH_BYPASS =
  !import.meta.env.PROD &&
  !isSupabaseConfigured &&
  import.meta.env.VITE_AUTH_BYPASS === 'true'

function bypassSession(): SessionUser {
  // On reprend le compte president du jeu de donnees s'il existe, sinon un compte synthetique.
  const admin = getTable('accounts').find((a) => a.role === 'president')
  return admin
    ? {
        id: admin.id,
        email: admin.email,
        display_name: `${admin.display_name} (bypass)`,
        role: admin.role,
        member_id: admin.member_id,
      }
    : {
        id: 'bypass-admin',
        email: 'bypass@prismequimper.fr',
        display_name: 'Président (bypass)',
        role: 'president',
        member_id: null,
      }
}

// --- MOCK : restauration synchrone depuis sessionStorage --------------------
function loadMockSession(): SessionUser | null {
  if (AUTH_BYPASS) return bypassSession()
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

// --- SUPABASE : construit l'utilisateur de session a partir du profil --------
//  L'email vient de auth.users ; le role / nom affiche / adherent lie viennent
//  de la table `profiles` (voir supabase/migrations/0001_initial_schema.sql).
async function buildSupabaseSession(
  authUserId: string,
  email: string | undefined,
): Promise<SessionUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, role, member_id, active')
    .eq('id', authUserId)
    .single()
  if (error || !data || data.active === false) return null
  return {
    id: authUserId,
    email: email ?? '',
    display_name: data.display_name,
    role: data.role as Role,
    member_id: data.member_id,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // En mode mock la session est connue immediatement ; en mode Supabase on doit
  // d'abord interroger le serveur, d'ou l'etat de chargement initial.
  const [user, setUser] = useState<SessionUser | null>(() =>
    isSupabaseConfigured ? null : loadMockSession(),
  )
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured)

  // Restauration + suivi de la session Supabase.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      const sUser = data.session?.user
      const next = sUser ? await buildSupabaseSession(sUser.id, sUser.email) : null
      if (active) {
        setUser(next)
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sUser = session?.user
      const next = sUser ? await buildSupabaseSession(sUser.id, sUser.email) : null
      if (active) setUser(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const mail = email.trim().toLowerCase()

    // --- Mode Supabase -------------------------------------------------------
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: mail, password })
      if (error || !data.user) {
        return { ok: false, error: 'E-mail ou mot de passe incorrect.' }
      }
      const session = await buildSupabaseSession(data.user.id, data.user.email)
      if (!session) {
        await supabase.auth.signOut()
        return { ok: false, error: 'Compte sans profil actif. Contactez un administrateur.' }
      }
      setUser(session)
      return { ok: true }
    }

    // --- Mode mock (localStorage) -------------------------------------------
    const accounts = getTable('accounts')
    const found = accounts.find((a: UserAccount) => a.email.toLowerCase() === mail)
    if (!found) return { ok: false, error: 'Aucun compte avec cet e-mail.' }
    if (!found.active) return { ok: false, error: 'Ce compte est désactivé.' }
    if (found.password !== password) return { ok: false, error: 'Mot de passe incorrect.' }

    const session: SessionUser = {
      id: found.id,
      email: found.email,
      display_name: found.display_name,
      role: found.role,
      member_id: found.member_id,
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
      setUser(null)
      return
    }
    sessionStorage.removeItem(SESSION_KEY)
    // En mode bypass, on reste connecte en admin (sinon deconnexion sans fin).
    setUser(AUTH_BYPASS ? bypassSession() : null)
  }, [])

  const can = useCallback(
    (permission: Permission) => {
      // En mode bypass (dev), on accorde TOUT pour pouvoir tout voir/modifier.
      if (AUTH_BYPASS) return true
      return user ? roleHas(user.role, permission) : false
    },
    [user],
  )

  const changePassword = useCallback(
    async (current: string, next: string): Promise<AuthResult> => {
      if (!user) return { ok: false, error: 'Vous n’êtes pas connecté.' }
      if (next.length < 6)
        return { ok: false, error: 'Le nouveau mot de passe est trop court (min. 6 caractères).' }

      // --- Mode Supabase -----------------------------------------------------
      if (isSupabaseConfigured && supabase) {
        // On revalide le mot de passe actuel avant de le changer.
        const { error: reauth } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: current,
        })
        if (reauth) return { ok: false, error: 'Mot de passe actuel incorrect.' }
        const { error } = await supabase.auth.updateUser({ password: next })
        if (error) return { ok: false, error: 'Impossible de modifier le mot de passe.' }
        return { ok: true }
      }

      // --- Mode mock ---------------------------------------------------------
      if (AUTH_BYPASS)
        return { ok: false, error: 'Indisponible en mode bypass (authentification désactivée).' }
      const account = getTable('accounts').find((a) => a.id === user.id)
      if (!account) return { ok: false, error: 'Compte introuvable.' }
      if (account.password !== current)
        return { ok: false, error: 'Mot de passe actuel incorrect.' }
      updateRow('accounts', account.id, { password: next })
      return { ok: true }
    },
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, can, changePassword }),
    [user, loading, login, logout, can, changePassword],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
