import { useState } from 'react'
import { KeyRound, UserCircle } from 'lucide-react'
import { useAuth, AUTH_BYPASS } from '@/auth/AuthContext'
import { ROLE_LABELS } from '@/types'
import { Card, Field, PageHeader } from '@/components/ui'

export function Profil() {
  const { user, changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (next !== confirm) {
      setMsg({ ok: false, text: 'Les deux nouveaux mots de passe ne correspondent pas.' })
      return
    }
    const res = changePassword(current, next)
    if (res.ok) {
      setMsg({ ok: true, text: 'Mot de passe modifié avec succès.' })
      setCurrent('')
      setNext('')
      setConfirm('')
    } else {
      setMsg({ ok: false, text: res.error ?? 'Erreur.' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mon profil" subtitle="Vos informations et votre mot de passe" />

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <UserCircle size={48} className="text-prisme-gold-mat" />
          <div>
            <p className="font-serif text-xl text-prisme-base">{user?.display_name}</p>
            <p className="text-sm text-prisme-base/60">{user?.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-prisme-gold-mat">
              {user ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 section-title text-xl">
          <KeyRound size={18} /> Changer mon mot de passe
        </h2>

        {AUTH_BYPASS ? (
          <p className="rounded border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            La modification du mot de passe est désactivée tant que le mode « bypass »
            d'authentification est actif.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Mot de passe actuel">
              <input
                type="password"
                className="input"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </Field>
            <Field label="Nouveau mot de passe">
              <input
                type="password"
                className="input"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>

            {msg && (
              <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>
            )}

            <button type="submit" className="btn-primary">
              Mettre à jour
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}
