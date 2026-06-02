import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import type { Permission } from '@/auth/permissions'

/** Bloque l'acces aux personnes non connectees. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  // En mode Supabase, on attend la restauration de la session avant de decider
  // (sinon on redirigerait brievement vers /connexion a chaque rechargement).
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-prisme-base/50">
        Chargement…
      </div>
    )
  }
  if (!user) return <Navigate to="/connexion" replace />
  return <>{children}</>
}

/** Bloque l'acces si le role ne possede pas la permission requise. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const { can } = useAuth()
  if (!can(permission)) {
    return (
      <div className="card mx-auto mt-16 max-w-lg text-center">
        <h2 className="font-serif text-2xl text-prisme-gold-mat">Accès restreint</h2>
        <p className="mt-3 text-sm text-prisme-base/70">
          Votre rôle ne vous donne pas accès à cette section. Rapprochez-vous d'un administrateur du
          bureau si vous pensez que c'est une erreur.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
