// Contexte d'authentification.
//
// Mode MOCK : la connexion verifie email/mot de passe dans la table `accounts`
// (localStorage) et garde la session dans sessionStorage.
// Le jour de la bascule Supabase, seule l'implementation de connexion change ;
// l'API (`useAuth`, `can`, `user`) reste identique pour les composants.

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, UserAccount } from '@/types'
import { getTable, update as updateRow } from '@/lib/data/store'
import { roleHas, type Permission } from './permissions'

interface SessionUser {
  id: string
  email: string
  display_name: string
  role: Role
  member_id?: string | null
}

interface AuthContextValue {
  user: SessionUser | null
  login: (email: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  can: (permission: Permission) => boolean
  changePassword: (current: string, next: string) => { ok: boolean; error?: string }
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SESSION_KEY = 'prisme-bureau-session'

// ----------------------------------------------------------------------------
//  BYPASS D'AUTHENTIFICATION (developpement uniquement)
//
//  Active avec VITE_AUTH_BYPASS=true dans .env.local : connecte automatiquement
//  un compte President sans passer par l'ecran de connexion.
//
//  /!\ NE JAMAIS activer ce flag sur le site mis en ligne : cela donnerait a
//      n'importe quel visiteur l'acces total (compta, documents, comptes).
//      Une banniere rouge s'affiche tant qu'il est actif pour eviter l'oubli.
// ----------------------------------------------------------------------------
export const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'

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

function loadSession(): SessionUser | null {
  if (AUTH_BYPASS) return bypassSession()
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(loadSession)

  const login = useCallback((email: string, password: string) => {
    const accounts = getTable('accounts')
    const found = accounts.find(
      (a: UserAccount) => a.email.toLowerCase() === email.trim().toLowerCase(),
    )
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

  const logout = useCallback(() => {
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
    (current: string, next: string) => {
      if (!user) return { ok: false, error: 'Vous n’êtes pas connecté.' }
      if (AUTH_BYPASS)
        return { ok: false, error: 'Indisponible en mode bypass (authentification désactivée).' }
      const account = getTable('accounts').find((a) => a.id === user.id)
      if (!account) return { ok: false, error: 'Compte introuvable.' }
      if (account.password !== current)
        return { ok: false, error: 'Mot de passe actuel incorrect.' }
      if (next.length < 4)
        return { ok: false, error: 'Le nouveau mot de passe est trop court (min. 4 caractères).' }
      // Mode mock : on enregistre dans le store. En Supabase, on appellera supabase.auth.updateUser.
      updateRow('accounts', account.id, { password: next })
      return { ok: true }
    },
    [user],
  )

  const value = useMemo(
    () => ({ user, login, logout, can, changePassword }),
    [user, login, logout, can, changePassword],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
