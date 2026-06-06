import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Field } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/supabase'

// Comptes de demonstration du mode local uniquement (adresses fictives
// @example.fr). En production, l'authentification passe par Supabase avec les
// vraies adresses des membres : ce bloc est masque (voir plus bas).
const DEMO_ACCOUNTS = [
  { email: 'president@example.fr', role: 'Administrateur' },
  { email: 'tresorier@example.fr', role: 'Trésorier' },
  { email: 'communication@example.fr', role: 'Membre du bureau' },
  { email: 'romain@example.fr', role: 'Lecture seule' },
]

export function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) {
    navigate('/', { replace: true })
  }

  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await login(email, password)
    setSubmitting(false)
    if (res.ok) navigate('/', { replace: true })
    else setError(res.error ?? 'Connexion impossible.')
  }

  const quickFill = (mail: string) => {
    setEmail(mail)
    setPassword('prisme')
    setError('')
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
          <h1 className="mt-4 font-serif text-2xl text-prisme-base">PRISME QUIMPER</h1>
          <p className="text-xs uppercase tracking-[0.25em] text-prisme-gold-mat">Espace Bureau</p>
        </div>

        <div className="card">
          <form onSubmit={submit} className="space-y-4">
            <Field label="E-mail">
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@example.fr"
                required
              />
            </Field>
            <Field label="Mot de passe">
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Comptes de demonstration : uniquement en mode local (mock). En production
            avec Supabase, on n'affiche jamais d'identifiants de demo. */}
        {!isSupabaseConfigured && (
          <div className="mt-6 rounded-lg border border-prisme-gold-mat/15 bg-prisme-inner/40 p-4 text-xs">
            <p className="mb-2 font-medium text-prisme-gold-mat">
              Comptes de démonstration (mot de passe :{' '}
              <code className="text-prisme-gold">prisme</code>)
            </p>
            <ul className="space-y-1">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    onClick={() => quickFill(a.email)}
                    className="text-prisme-base/70 underline-offset-2 hover:text-prisme-gold hover:underline"
                  >
                    {a.email}
                  </button>
                  <span className="text-prisme-base/40"> — {a.role}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
