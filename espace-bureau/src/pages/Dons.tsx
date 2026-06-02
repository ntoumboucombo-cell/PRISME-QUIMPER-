import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { insert, remove, update, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { formatDate, formatEuro } from '@/lib/format'
import { PAYMENT_MODE_LABELS, type Don, type DonType, type PaymentMode } from '@/types'
import { Badge, EmptyState, Field, Modal, PageHeader, StatCard } from '@/components/ui'

export function Dons() {
  const dons = useTable('dons')
  const projects = useTable('projects')
  const { can } = useAuth()
  const canWrite = can('finances.write')
  const [adding, setAdding] = useState(false)

  const sorted = [...dons].sort((a, b) => b.date_don.localeCompare(a.date_don))
  const total = dons.reduce((a, d) => a + d.montant, 0)
  const recus = dons.filter((d) => d.recu_fiscal_emis).length

  const projName = (id?: string | null) => projects.find((p) => p.id === id)?.nom

  return (
    <div>
      <PageHeader
        title="Dons"
        subtitle="Suivi des dons et reçus fiscaux"
        action={
          canWrite && (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Enregistrer un don
            </button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total des dons" value={formatEuro(total)} tone="gold" />
        <StatCard label="Nombre de dons" value={dons.length} tone="neutral" />
        <StatCard label="Reçus fiscaux émis" value={`${recus}/${dons.length}`} tone="green" />
      </div>

      <div className="card overflow-x-auto">
        {sorted.length === 0 ? (
          <EmptyState message="Aucun don enregistré." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Donateur</th>
                <th className="text-right">Montant</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Type</th>
                <th>Projet fléché</th>
                <th>Reçu fiscal</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="text-prisme-base">{d.donateur_nom}</div>
                    {d.donateur_email && (
                      <div className="text-xs text-prisme-base/50">{d.donateur_email}</div>
                    )}
                  </td>
                  <td className="text-right">{formatEuro(d.montant)}</td>
                  <td className="text-prisme-base/70">{formatDate(d.date_don)}</td>
                  <td className="text-prisme-base/70">{PAYMENT_MODE_LABELS[d.mode]}</td>
                  <td>
                    <Badge tone={d.type === 'regulier' ? 'blue' : 'neutral'}>
                      {d.type === 'regulier' ? 'Régulier' : 'Ponctuel'}
                    </Badge>
                  </td>
                  <td className="text-prisme-base/70">{projName(d.project_id) ?? '—'}</td>
                  <td>
                    {canWrite ? (
                      <input
                        type="checkbox"
                        checked={d.recu_fiscal_emis}
                        onChange={(e) =>
                          update('dons', d.id, { recu_fiscal_emis: e.target.checked })
                        }
                        className="accent-prisme-gold-mat"
                      />
                    ) : d.recu_fiscal_emis ? (
                      'Oui'
                    ) : (
                      'Non'
                    )}
                  </td>
                  {canWrite && (
                    <td>
                      <button
                        className="btn-ghost p-2 text-red-300"
                        onClick={() => remove('dons', d.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <DonForm
          onClose={() => setAdding(false)}
          onSave={(data) => {
            insert('dons', data)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function DonForm({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (d: Omit<Don, 'id' | 'created_at'>) => void
}) {
  const projects = useTable('projects')
  const [form, setForm] = useState<Omit<Don, 'id' | 'created_at'>>({
    donateur_nom: '',
    donateur_email: '',
    montant: 0,
    date_don: new Date().toISOString().slice(0, 10),
    mode: 'virement',
    type: 'ponctuel',
    recu_fiscal_emis: false,
    project_id: null,
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Modal open onClose={onClose} title="Enregistrer un don">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du donateur">
            <input
              className="input"
              value={form.donateur_nom}
              onChange={(e) => set({ donateur_nom: e.target.value })}
              required
            />
          </Field>
          <Field label="E-mail (optionnel)">
            <input
              type="email"
              className="input"
              value={form.donateur_email}
              onChange={(e) => set({ donateur_email: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Montant (€)">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.montant || ''}
              onChange={(e) => set({ montant: Number(e.target.value) || 0 })}
              required
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="input"
              value={form.date_don}
              onChange={(e) => set({ date_don: e.target.value })}
            />
          </Field>
          <Field label="Mode">
            <select
              className="input"
              value={form.mode}
              onChange={(e) => set({ mode: e.target.value as PaymentMode })}
            >
              {Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select
              className="input"
              value={form.type}
              onChange={(e) => set({ type: e.target.value as DonType })}
            >
              <option value="ponctuel">Ponctuel</option>
              <option value="regulier">Régulier</option>
            </select>
          </Field>
          <Field label="Don fléché vers un projet (optionnel)">
            <select
              className="input"
              value={form.project_id ?? ''}
              onChange={(e) => set({ project_id: e.target.value || null })}
            >
              <option value="">— Aucun —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
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
