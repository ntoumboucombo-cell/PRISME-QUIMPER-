import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { insert, remove, update, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { formatDate } from '@/lib/format'
import type { Civilite, Member, MemberStatus } from '@/types'
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui'

const STATUS_TONE: Record<MemberStatus, 'green' | 'gold' | 'neutral'> = {
  actif: 'green',
  adherent: 'gold',
  ancien: 'neutral',
}
const STATUS_LABEL: Record<MemberStatus, string> = {
  actif: 'Membre actif',
  adherent: 'Adhérent',
  ancien: 'Ancien',
}

type Draft = Partial<Member>

export function Adherents() {
  const members = useTable('members')
  const { can } = useAuth()
  const canWrite = can('adherents.write')
  const [editing, setEditing] = useState<Draft | null>(null)

  const sorted = [...members].sort((a, b) => a.nom.localeCompare(b.nom))

  const save = (draft: Draft) => {
    if (draft.id) {
      update('members', draft.id, draft)
    } else {
      insert('members', {
        civilite: draft.civilite ?? 'Autre',
        nom: draft.nom ?? '',
        prenom: draft.prenom ?? '',
        email: draft.email ?? '',
        telephone: draft.telephone ?? '',
        etablissement: draft.etablissement ?? '',
        statut: draft.statut ?? 'adherent',
        fonction_bureau: draft.fonction_bureau ?? '',
        date_adhesion: draft.date_adhesion ?? new Date().toISOString().slice(0, 10),
        notes: draft.notes ?? '',
      } as Omit<Member, 'id' | 'created_at'>)
    }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title="Adhérents"
        subtitle={`${members.length} personne(s) enregistrée(s)`}
        action={
          canWrite && (
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus size={16} /> Nouvel adhérent
            </button>
          )
        }
      />

      <div className="card overflow-x-auto">
        {sorted.length === 0 ? (
          <EmptyState message="Aucun adhérent." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Établissement</th>
                <th>Statut</th>
                <th>Fonction</th>
                <th>Adhésion</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="text-prisme-base">
                      {m.prenom} {m.nom}
                    </div>
                    <div className="text-xs text-prisme-base/50">{m.email}</div>
                  </td>
                  <td className="text-prisme-base/70">{m.etablissement || '—'}</td>
                  <td>
                    <Badge tone={STATUS_TONE[m.statut]}>{STATUS_LABEL[m.statut]}</Badge>
                  </td>
                  <td className="text-prisme-base/70">{m.fonction_bureau || '—'}</td>
                  <td className="text-prisme-base/70">{formatDate(m.date_adhesion)}</td>
                  {canWrite && (
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost p-2" onClick={() => setEditing(m)}>
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-ghost p-2 text-red-300"
                          onClick={() => {
                            if (confirm(`Supprimer ${m.prenom} ${m.nom} ?`)) remove('members', m.id)
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <MemberForm draft={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function MemberForm({
  draft,
  onCancel,
  onSave,
}: {
  draft: Draft
  onCancel: () => void
  onSave: (d: Draft) => void
}) {
  const [form, setForm] = useState<Draft>(draft)
  const set = (patch: Draft) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Modal open onClose={onCancel} title={draft.id ? 'Modifier l’adhérent' : 'Nouvel adhérent'} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Civilité">
            <select
              className="input"
              value={form.civilite ?? 'Autre'}
              onChange={(e) => set({ civilite: e.target.value as Civilite })}
            >
              <option value="Mme">Mme</option>
              <option value="M.">M.</option>
              <option value="Autre">Autre</option>
            </select>
          </Field>
          <Field label="Prénom" className="sm:col-span-1">
            <input
              className="input"
              value={form.prenom ?? ''}
              onChange={(e) => set({ prenom: e.target.value })}
              required
            />
          </Field>
          <Field label="Nom">
            <input
              className="input"
              value={form.nom ?? ''}
              onChange={(e) => set({ nom: e.target.value })}
              required
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail">
            <input
              type="email"
              className="input"
              value={form.email ?? ''}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>
          <Field label="Téléphone">
            <input
              className="input"
              value={form.telephone ?? ''}
              onChange={(e) => set({ telephone: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Établissement / Profession">
            <input
              className="input"
              value={form.etablissement ?? ''}
              onChange={(e) => set({ etablissement: e.target.value })}
            />
          </Field>
          <Field label="Statut">
            <select
              className="input"
              value={form.statut ?? 'adherent'}
              onChange={(e) => set({ statut: e.target.value as MemberStatus })}
            >
              <option value="adherent">Adhérent</option>
              <option value="actif">Membre actif</option>
              <option value="ancien">Ancien</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fonction au bureau (optionnel)">
            <input
              className="input"
              value={form.fonction_bureau ?? ''}
              onChange={(e) => set({ fonction_bureau: e.target.value })}
              placeholder="Ex : Président"
            />
          </Field>
          <Field label="Date d'adhésion">
            <input
              type="date"
              className="input"
              value={form.date_adhesion ?? ''}
              onChange={(e) => set({ date_adhesion: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn-primary">
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  )
}
