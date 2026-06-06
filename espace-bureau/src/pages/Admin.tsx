import { useState } from 'react'
import { Plus, Trash2, RotateCcw, ShieldCheck } from 'lucide-react'
import { createAccount, remove, resetDatabase, update, useTable } from '@/lib/data/store'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthContext'
import { ROLE_LABELS, type Role, type UserAccount } from '@/types'
import { Badge, Card, Field, Modal, PageHeader } from '@/components/ui'

const ROLE_TONE: Record<Role, 'gold' | 'green' | 'blue' | 'neutral'> = {
  president: 'gold',
  vice_president: 'gold',
  secretaire: 'blue',
  secretaire_adjoint: 'blue',
  tresorier: 'green',
  tresorier_adjoint: 'green',
  membre: 'blue',
  adherent: 'neutral',
}

export function Admin() {
  const accounts = useTable('accounts')
  const members = useTable('members')
  const { user } = useAuth()
  const [adding, setAdding] = useState(false)

  const memberName = (id?: string | null) => {
    const m = members.find((x) => x.id === id)
    return m ? `${m.prenom} ${m.nom}` : '—'
  }

  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle="Gestion des comptes et des droits d'accès"
        action={
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Nouveau compte
          </button>
        }
      />

      <Card className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Adhérent lié</th>
              <th>Rôle</th>
              <th>État</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => {
              const isSelf = a.id === user?.id
              return (
                <tr key={a.id}>
                  <td>
                    <div className="text-prisme-base">{a.display_name}</div>
                    <div className="text-xs text-prisme-base/50">{a.email}</div>
                  </td>
                  <td className="text-prisme-base/70">{memberName(a.member_id)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          {
                            gold: 'bg-prisme-gold',
                            green: 'bg-emerald-400',
                            blue: 'bg-sky-400',
                            neutral: 'bg-prisme-base/40',
                          }[ROLE_TONE[a.role]]
                        }`}
                      />
                      <select
                        className="input max-w-[180px] py-1"
                        value={a.role}
                        disabled={isSelf}
                        onChange={(e) => update('accounts', a.id, { role: e.target.value as Role })}
                      >
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => !isSelf && update('accounts', a.id, { active: !a.active })}
                      disabled={isSelf}
                    >
                      <Badge tone={a.active ? 'green' : 'red'}>
                        {a.active ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </button>
                  </td>
                  <td>
                    {!isSelf && (
                      <button
                        className="btn-ghost p-2 text-red-300"
                        onClick={() => {
                          if (confirm(`Supprimer le compte ${a.email} ?`)) remove('accounts', a.id)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 section-title text-lg">
            <ShieldCheck size={18} /> Rappel des droits
          </h2>
          <ul className="space-y-2 text-sm text-prisme-base/70">
            <li>
              <Badge tone="gold">Président</Badge> /{' '}
              <Badge tone="gold">Vice-Président</Badge> — accès total + gestion des comptes
            </li>
            <li>
              <Badge tone="blue">Secrétaire Général</Badge> /{' '}
              <Badge tone="blue">Secrétaire adjoint</Badge> — secrétariat (comptes rendus,
              convocations, registre) + bureau ; pas la comptabilité
            </li>
            <li>
              <Badge tone="green">Trésorier</Badge> /{' '}
              <Badge tone="green">Trésorier adjoint</Badge> — comptabilité complète + adhérents,
              projets, documents
            </li>
            <li>
              <Badge tone="blue">Membre du bureau</Badge> — adhérents, projets, documents, agenda ;
              secrétariat en lecture (pas la comptabilité)
            </li>
            <li>
              <Badge tone="neutral">Adhérent</Badge> — aucun accès à l'espace bureau
            </li>
          </ul>
        </Card>

        {isSupabaseConfigured ? (
          <Card>
            <h2 className="mb-3 section-title text-lg">Comptes (mode Supabase)</h2>
            <p className="text-sm text-prisme-base/60">
              Les comptes sont gérés par Supabase. Vous pouvez <strong>créer un compte</strong>,{' '}
              <strong>changer les rôles</strong> et <strong>activer / désactiver</strong> les
              profils. La création nécessite que l'Edge Function{' '}
              <code className="text-prisme-gold">create-account</code> soit déployée — voir{' '}
              <code className="text-prisme-gold">docs/INTEGRATION-SUPABASE.md</code>.
            </p>
          </Card>
        ) : (
          <Card>
            <h2 className="mb-3 section-title text-lg">Données de démonstration</h2>
            <p className="mb-4 text-sm text-prisme-base/60">
              En mode local (sans Supabase), les données sont stockées dans ce navigateur. Vous
              pouvez réinitialiser le jeu de démonstration à tout moment.
            </p>
            <button
              className="btn-outline"
              onClick={() => {
                if (confirm('Réinitialiser toutes les données de démonstration ?')) resetDatabase()
              }}
            >
              <RotateCcw size={15} /> Réinitialiser les données
            </button>
          </Card>
        )}
      </div>

      {adding && <AccountForm onClose={() => setAdding(false)} />}
    </div>
  )
}

function AccountForm({ onClose }: { onClose: () => void }) {
  const members = useTable('members')
  const [form, setForm] = useState<Omit<UserAccount, 'id' | 'created_at'>>({
    email: '',
    password: 'prisme',
    display_name: '',
    role: 'adherent',
    member_id: null,
    active: true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await createAccount({
      email: form.email,
      password: form.password ?? '',
      display_name: form.display_name,
      role: form.role,
      member_id: form.member_id ?? null,
    })
    setBusy(false)
    if (res.ok) onClose()
    else setError(res.error ?? 'Création impossible.')
  }

  return (
    <Modal open onClose={onClose} title="Nouveau compte">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom affiché">
          <input
            className="input"
            value={form.display_name}
            onChange={(e) => set({ display_name: e.target.value })}
            required
          />
        </Field>
        <Field label="E-mail">
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rôle">
            <select
              className="input"
              value={form.role}
              onChange={(e) => set({ role: e.target.value as Role })}
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Adhérent lié (optionnel)">
            <select
              className="input"
              value={form.member_id ?? ''}
              onChange={(e) => set({ member_id: e.target.value || null })}
            >
              <option value="">— Aucun —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.prenom} {m.nom}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={isSupabaseConfigured ? 'Mot de passe initial' : 'Mot de passe (démo locale)'}>
          <input
            className="input"
            value={form.password ?? ''}
            onChange={(e) => set({ password: e.target.value })}
            required
            minLength={6}
          />
        </Field>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
