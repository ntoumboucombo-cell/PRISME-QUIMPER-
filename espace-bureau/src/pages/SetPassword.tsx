import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Field } from '@/components/ui'

// Ecran affiche lorsqu'un utilisateur ouvre un lien d'invitation (ou de mot de
// passe oublie) : la session est deja valide, il ne reste qu'a choisir un mot de
// passe. Voir AuthContext.passwordSetupRequired / completePasswordSetup.
export function SetPassword() {
  const { user, completePasswordSetup } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setSubmitting(true)
    const res = await completePasswordSetup(password)
    setSubmitting(false)
    if (res.ok) navigate('/', { replace: true })
    else setError(res.error ?? 'Impossible de définir le mot de passe.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src={`${import.meta.env.BASE_URL}logo.PNG`}
            alt="PRISME QUIMPER"
            className="mx-auto h-20 w-20 rounded-full"
          />
          <h1 className="mt-4 font-serif text-2xl text-prisme-base">Bienvenue</h1>
          <p className="text-xs uppercase tracking-[0.25em] text-prisme-gold-mat">Espace Bureau</p>
        </div>

        <div className="card">
          <p className="mb-4 text-sm text-prisme-base/70">
            {user?.email ? (
              <>
                Vous êtes invité·e avec l'adresse <strong>{user.email}</strong>. Choisissez un mot de
                passe pour activer votre compte.
              </>
            ) : (
              'Choisissez un mot de passe pour activer votre compte.'
            )}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nouveau mot de passe">
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </Field>
            <Field label="Confirmer le mot de passe">
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </Field>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Activer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
