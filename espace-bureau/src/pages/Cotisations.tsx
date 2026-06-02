import { useMemo, useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { insert, remove, update, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { currentSaison, formatDate, formatEuro } from '@/lib/format'
import {
  PAYMENT_MODE_LABELS,
  type Cotisation,
  type CotisationStatus,
  type PaymentMode,
} from '@/types'
import { Badge, EmptyState, Field, Modal, PageHeader, StatCard } from '@/components/ui'

const STATUS_TONE: Record<CotisationStatus, 'green' | 'amber' | 'red'> = {
  paye: 'green',
  attente: 'amber',
  annule: 'red',
}
const STATUS_LABEL: Record<CotisationStatus, string> = {
  paye: 'Payée',
  attente: 'En attente',
  annule: 'Annulée',
}

export function Cotisations() {
  const cotisations = useTable('cotisations')
  const members = useTable('members')
  const { can } = useAuth()
  const canWrite = can('finances.write')

  const saisons = useMemo(() => {
    const set = new Set(cotisations.map((c) => c.saison))
    set.add(currentSaison())
    return [...set].sort().reverse()
  }, [cotisations])

  const [saison, setSaison] = useState(currentSaison())
  const [adding, setAdding] = useState(false)

  const memberName = (id: string) => {
    const m = members.find((x) => x.id === id)
    return m ? `${m.prenom} ${m.nom}` : '—'
  }

  const rows = cotisations.filter((c) => c.saison === saison)
  const encaisse = rows.filter((c) => c.statut === 'paye').reduce((a, c) => a + c.montant, 0)
  const attente = rows.filter((c) => c.statut === 'attente').reduce((a, c) => a + c.montant, 0)

  const markPaid = (c: Cotisation) =>
    update('cotisations', c.id, {
      statut: 'paye',
      date_paiement: c.date_paiement ?? new Date().toISOString().slice(0, 10),
      mode: c.mode ?? 'virement',
    })

  return (
    <div>
      <PageHeader
        title="Cotisations"
        subtitle="Suivi des paiements des adhérents"
        action={
          canWrite && (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Enregistrer une cotisation
            </button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Encaissé" value={formatEuro(encaisse)} tone="green" />
        <StatCard label="En attente" value={formatEuro(attente)} tone="amber" />
        <StatCard label="Cotisations" value={rows.length} tone="neutral" />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-prisme-base/60">Saison :</span>
        <select className="input max-w-[160px]" value={saison} onChange={(e) => setSaison(e.target.value)}>
          {saisons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState message="Aucune cotisation pour cette saison." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Adhérent</th>
                <th className="text-right">Montant</th>
                <th>Statut</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Reçu</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="text-prisme-base">{memberName(c.member_id)}</td>
                  <td className="text-right">{formatEuro(c.montant)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[c.statut]}>{STATUS_LABEL[c.statut]}</Badge>
                  </td>
                  <td className="text-prisme-base/70">{c.mode ? PAYMENT_MODE_LABELS[c.mode] : '—'}</td>
                  <td className="text-prisme-base/70">{formatDate(c.date_paiement)}</td>
                  <td>
                    {canWrite ? (
                      <input
                        type="checkbox"
                        checked={c.recu_emis}
                        onChange={(e) => update('cotisations', c.id, { recu_emis: e.target.checked })}
                        className="accent-prisme-gold-mat"
                      />
                    ) : c.recu_emis ? (
                      'Oui'
                    ) : (
                      'Non'
                    )}
                  </td>
                  {canWrite && (
                    <td>
                      <div className="flex justify-end gap-1">
                        {c.statut !== 'paye' && (
                          <button
                            className="btn-ghost p-2 text-emerald-300"
                            title="Marquer payée"
                            onClick={() => markPaid(c)}
                          >
                            <Check size={15} />
                          </button>
                        )}
                        <button
                          className="btn-ghost p-2 text-red-300"
                          onClick={() => remove('cotisations', c.id)}
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

      {adding && (
        <CotisationForm
          saison={saison}
          onClose={() => setAdding(false)}
          onSave={(data) => {
            insert('cotisations', data)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function CotisationForm({
  saison,
  onClose,
  onSave,
}: {
  saison: string
  onClose: () => void
  onSave: (c: Omit<Cotisation, 'id' | 'created_at'>) => void
}) {
  const members = useTable('members')
  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [montant, setMontant] = useState('15')
  const [statut, setStatut] = useState<CotisationStatus>('paye')
  const [mode, setMode] = useState<PaymentMode>('virement')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  return (
    <Modal open onClose={onClose} title="Enregistrer une cotisation">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave({
            member_id: memberId,
            saison,
            montant: Number(montant) || 0,
            statut,
            mode: statut === 'paye' ? mode : null,
            date_paiement: statut === 'paye' ? date : null,
            recu_emis: false,
          })
        }}
        className="space-y-4"
      >
        <Field label="Adhérent">
          <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.prenom} {m.nom}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Montant (€)">
            <input
              type="number"
              step="0.01"
              className="input"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
          </Field>
          <Field label="Saison">
            <input className="input" value={saison} disabled />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Statut">
            <select className="input" value={statut} onChange={(e) => setStatut(e.target.value as CotisationStatus)}>
              <option value="paye">Payée</option>
              <option value="attente">En attente</option>
            </select>
          </Field>
          <Field label="Mode">
            <select
              className="input"
              value={mode}
              onChange={(e) => setMode(e.target.value as PaymentMode)}
              disabled={statut !== 'paye'}
            >
              {Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={statut !== 'paye'}
            />
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
