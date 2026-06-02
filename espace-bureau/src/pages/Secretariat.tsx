import { useState } from 'react'
import {
  FileText,
  Mail,
  BookMarked,
  FileDown,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Send,
} from 'lucide-react'
import { insert, remove, update, useTable } from '@/lib/data/store'
import { useAuth } from '@/auth/AuthContext'
import { formatDate } from '@/lib/format'
import { generateDocx } from '@/lib/docgen'
import {
  INSTANCE_LABELS,
  REGISTRE_TYPE_LABELS,
  type Convocation,
  type ConvocationStatut,
  type Instance,
  type ProcesVerbal,
  type RegistreEntry,
  type RegistreType,
} from '@/types'
import { Badge, Card, EmptyState, Field, Modal, PageHeader, TimeSelect } from '@/components/ui'
import { ModelesTab } from './SecretariatModeles'

type Tab = 'pv' | 'convocations' | 'registre' | 'modeles'

const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'pv', label: 'Comptes rendus', icon: FileText },
  { key: 'convocations', label: 'Convocations', icon: Mail },
  { key: 'registre', label: 'Registre spécial', icon: BookMarked },
  { key: 'modeles', label: 'Modèles Word', icon: FileDown },
]

/** Genere un PV Word pre-rempli a partir d'un enregistrement de PV. */
async function genererPVWord(pv: ProcesVerbal, secretaireName: string) {
  await generateDocx(
    'pv',
    {
      type_reunion: INSTANCE_LABELS[pv.instance],
      reference: '',
      date: formatDate(pv.date),
      date_redaction: '',
      heure_debut: '',
      heure_fin: '',
      lieu: '',
      presents: pv.presents ?? '',
      excuses: pv.excuses ?? '',
      secretaire: secretaireName,
      ordre_du_jour: pv.ordre_du_jour ?? '',
      deroule: pv.decisions ?? '',
      resolution_1: '',
      resultat_1: '',
      resolution_2: '',
      resultat_2: '',
    },
    `PV ${INSTANCE_LABELS[pv.instance]} ${pv.date}.docx`,
  )
}

export function Secretariat() {
  const { can } = useAuth()
  const canWrite = can('secretariat.write')
  const [tab, setTab] = useState<Tab>('pv')

  return (
    <div>
      <PageHeader
        title="Secrétariat"
        subtitle="Comptes rendus, convocations et registre des délibérations"
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-prisme-gold-mat/15">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors ${
              tab === key
                ? 'border-prisme-gold text-prisme-gold'
                : 'border-transparent text-prisme-base/60 hover:text-prisme-base'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'pv' && <PVSection canWrite={canWrite} />}
      {tab === 'convocations' && <ConvocationsSection canWrite={canWrite} />}
      {tab === 'registre' && <RegistreSection canWrite={canWrite} />}
      {tab === 'modeles' && <ModelesTab />}
    </div>
  )
}

const INSTANCE_TONE: Record<Instance, 'gold' | 'green' | 'blue' | 'amber'> = {
  ag: 'gold',
  ag_extra: 'amber',
  ca: 'blue',
  bureau: 'green',
}

// ============================ Comptes rendus / PV ===========================

function PVSection({ canWrite }: { canWrite: boolean }) {
  const pvs = useTable('proces_verbaux')
  const members = useTable('members')
  const [editing, setEditing] = useState<Partial<ProcesVerbal> | null>(null)

  const sorted = [...pvs].sort((a, b) => b.date.localeCompare(a.date))
  const memberName = (id?: string | null) => {
    const m = members.find((x) => x.id === id)
    return m ? `${m.prenom} ${m.nom}` : '—'
  }

  const save = (d: Partial<ProcesVerbal>) => {
    if (d.id) update('proces_verbaux', d.id, d)
    else
      insert('proces_verbaux', {
        instance: d.instance ?? 'bureau',
        date: d.date ?? new Date().toISOString().slice(0, 10),
        titre: d.titre ?? '',
        ordre_du_jour: d.ordre_du_jour ?? '',
        decisions: d.decisions ?? '',
        presents: d.presents ?? '',
        excuses: d.excuses ?? '',
        document_url: d.document_url ?? null,
        document_nom: d.document_nom ?? null,
        redige_par: d.redige_par ?? null,
      } as Omit<ProcesVerbal, 'id' | 'created_at'>)
    setEditing(null)
  }

  return (
    <div>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary" onClick={() => setEditing({})}>
            <Plus size={16} /> Nouveau compte rendu
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <EmptyState message="Aucun compte rendu enregistré." />
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((pv) => (
            <Card key={pv.id}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={INSTANCE_TONE[pv.instance]}>{INSTANCE_LABELS[pv.instance]}</Badge>
                    <span className="text-xs text-prisme-base/50">{formatDate(pv.date)}</span>
                  </div>
                  <h3 className="mt-1 font-serif text-lg text-prisme-base">{pv.titre}</h3>
                </div>
                {canWrite && (
                  <div className="flex gap-1">
                    <button className="btn-ghost p-2" onClick={() => setEditing(pv)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn-ghost p-2 text-red-300"
                      onClick={() => {
                        if (confirm('Supprimer ce compte rendu ?')) remove('proces_verbaux', pv.id)
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {pv.ordre_du_jour && (
                <Detail label="Ordre du jour" value={pv.ordre_du_jour} />
              )}
              {pv.decisions && <Detail label="Décisions" value={pv.decisions} />}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {pv.presents && <Detail label="Présents" value={pv.presents} small />}
                {pv.excuses && <Detail label="Excusés" value={pv.excuses} small />}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                <span className="text-xs text-prisme-base/40">
                  Rédigé par {memberName(pv.redige_par)}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-outline"
                    onClick={() =>
                      genererPVWord(pv, memberName(pv.redige_par)).catch((e) => alert(e.message))
                    }
                    title="Générer un document Word pré-rempli à partir de ce compte rendu"
                  >
                    <FileDown size={14} /> Générer le Word
                  </button>
                  {pv.document_url && (
                    <a href={pv.document_url} target="_blank" rel="noreferrer" className="btn-outline">
                      <ExternalLink size={14} /> {pv.document_nom || 'Ouvrir le document'}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <PVForm draft={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function Detail({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="mt-2">
      <p className="text-xs uppercase tracking-wide text-prisme-gold-mat">{label}</p>
      <p className={`whitespace-pre-line text-prisme-base/80 ${small ? 'text-sm' : ''}`}>{value}</p>
    </div>
  )
}

function PVForm({
  draft,
  onCancel,
  onSave,
}: {
  draft: Partial<ProcesVerbal>
  onCancel: () => void
  onSave: (d: Partial<ProcesVerbal>) => void
}) {
  const members = useTable('members')
  const [form, setForm] = useState<Partial<ProcesVerbal>>(draft)
  const set = (p: Partial<ProcesVerbal>) => setForm((f) => ({ ...f, ...p }))

  return (
    <Modal open onClose={onCancel} title={draft.id ? 'Modifier le compte rendu' : 'Nouveau compte rendu'} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Instance">
            <select
              className="input"
              value={form.instance ?? 'bureau'}
              onChange={(e) => set({ instance: e.target.value as Instance })}
            >
              {Object.entries(INSTANCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de la réunion">
            <input
              type="date"
              className="input"
              value={form.date ?? ''}
              onChange={(e) => set({ date: e.target.value })}
              required
            />
          </Field>
          <Field label="Rédigé par">
            <select
              className="input"
              value={form.redige_par ?? ''}
              onChange={(e) => set({ redige_par: e.target.value || null })}
            >
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.prenom} {m.nom}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Titre">
          <input
            className="input"
            value={form.titre ?? ''}
            onChange={(e) => set({ titre: e.target.value })}
            required
          />
        </Field>
        <Field label="Ordre du jour">
          <textarea
            className="input"
            rows={3}
            value={form.ordre_du_jour ?? ''}
            onChange={(e) => set({ ordre_du_jour: e.target.value })}
          />
        </Field>
        <Field label="Décisions prises">
          <textarea
            className="input"
            rows={3}
            value={form.decisions ?? ''}
            onChange={(e) => set({ decisions: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Présents">
            <textarea
              className="input"
              rows={2}
              value={form.presents ?? ''}
              onChange={(e) => set({ presents: e.target.value })}
            />
          </Field>
          <Field label="Excusés">
            <textarea
              className="input"
              rows={2}
              value={form.excuses ?? ''}
              onChange={(e) => set({ excuses: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lien du document (Word / Microsoft 365)">
            <input
              className="input"
              value={form.document_url ?? ''}
              onChange={(e) => set({ document_url: e.target.value || null })}
              placeholder="https://…sharepoint.com/…"
            />
          </Field>
          <Field label="Nom affiché du document">
            <input
              className="input"
              value={form.document_nom ?? ''}
              onChange={(e) => set({ document_nom: e.target.value || null })}
              placeholder="Ex : PV réunion (Word)"
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

// ============================== Convocations ================================

function ConvocationsSection({ canWrite }: { canWrite: boolean }) {
  const convocations = useTable('convocations')
  const [editing, setEditing] = useState<Partial<Convocation> | null>(null)

  const sorted = [...convocations].sort((a, b) => b.date_reunion.localeCompare(a.date_reunion))

  const save = (d: Partial<Convocation>) => {
    if (d.id) update('convocations', d.id, d)
    else
      insert('convocations', {
        instance: d.instance ?? 'bureau',
        date_reunion: d.date_reunion ?? new Date().toISOString().slice(0, 10),
        heure: d.heure ?? null,
        lieu: d.lieu ?? '',
        ordre_du_jour: d.ordre_du_jour ?? '',
        date_envoi: d.date_envoi ?? null,
        statut: d.statut ?? 'brouillon',
        event_id: d.event_id ?? null,
      } as Omit<Convocation, 'id' | 'created_at'>)
    setEditing(null)
  }

  const markSent = (c: Convocation) =>
    update('convocations', c.id, {
      statut: 'envoyee',
      date_envoi: c.date_envoi ?? new Date().toISOString().slice(0, 10),
    })

  return (
    <div>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary" onClick={() => setEditing({})}>
            <Plus size={16} /> Nouvelle convocation
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <EmptyState message="Aucune convocation." />
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((c) => (
            <Card key={c.id}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={INSTANCE_TONE[c.instance]}>{INSTANCE_LABELS[c.instance]}</Badge>
                    <Badge tone={c.statut === 'envoyee' ? 'green' : 'amber'}>
                      {c.statut === 'envoyee' ? 'Envoyée' : 'Brouillon'}
                    </Badge>
                  </div>
                  <h3 className="mt-1 font-serif text-lg text-prisme-base">
                    Réunion du {formatDate(c.date_reunion)}
                    {c.heure ? ` à ${c.heure}` : ''}
                  </h3>
                  {c.lieu && <p className="text-sm text-prisme-base/60">{c.lieu}</p>}
                </div>
                {canWrite && (
                  <div className="flex gap-1">
                    {c.statut === 'brouillon' && (
                      <button
                        className="btn-ghost p-2 text-emerald-300"
                        title="Marquer comme envoyée"
                        onClick={() => markSent(c)}
                      >
                        <Send size={15} />
                      </button>
                    )}
                    <button className="btn-ghost p-2" onClick={() => setEditing(c)}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn-ghost p-2 text-red-300"
                      onClick={() => {
                        if (confirm('Supprimer cette convocation ?')) remove('convocations', c.id)
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              {c.ordre_du_jour && <Detail label="Ordre du jour" value={c.ordre_du_jour} />}
              {c.date_envoi && (
                <p className="mt-3 border-t border-white/5 pt-3 text-xs text-prisme-base/40">
                  Envoyée le {formatDate(c.date_envoi)}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <ConvocationForm draft={editing} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  )
}

function ConvocationForm({
  draft,
  onCancel,
  onSave,
}: {
  draft: Partial<Convocation>
  onCancel: () => void
  onSave: (d: Partial<Convocation>) => void
}) {
  const events = useTable('agenda_events')
  const [form, setForm] = useState<Partial<Convocation>>(draft)
  const set = (p: Partial<Convocation>) => setForm((f) => ({ ...f, ...p }))

  return (
    <Modal open onClose={onCancel} title={draft.id ? 'Modifier la convocation' : 'Nouvelle convocation'} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instance">
            <select
              className="input"
              value={form.instance ?? 'bureau'}
              onChange={(e) => set({ instance: e.target.value as Instance })}
            >
              {Object.entries(INSTANCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select
              className="input"
              value={form.statut ?? 'brouillon'}
              onChange={(e) => set({ statut: e.target.value as ConvocationStatut })}
            >
              <option value="brouillon">Brouillon</option>
              <option value="envoyee">Envoyée</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date de réunion">
            <input
              type="date"
              className="input"
              value={form.date_reunion ?? ''}
              onChange={(e) => set({ date_reunion: e.target.value })}
              required
            />
          </Field>
          <Field label="Heure">
            <TimeSelect value={form.heure} onChange={(v) => set({ heure: v })} />
          </Field>
          <Field label="Date d'envoi">
            <input
              type="date"
              className="input"
              value={form.date_envoi ?? ''}
              onChange={(e) => set({ date_envoi: e.target.value || null })}
            />
          </Field>
        </div>
        <Field label="Lieu">
          <input
            className="input"
            value={form.lieu ?? ''}
            onChange={(e) => set({ lieu: e.target.value })}
          />
        </Field>
        <Field label="Ordre du jour">
          <textarea
            className="input"
            rows={4}
            value={form.ordre_du_jour ?? ''}
            onChange={(e) => set({ ordre_du_jour: e.target.value })}
            placeholder={'1. …\n2. …\n3. Questions diverses'}
          />
        </Field>
        <Field label="Événement d'agenda lié (optionnel)">
          <select
            className="input"
            value={form.event_id ?? ''}
            onChange={(e) => set({ event_id: e.target.value || null })}
          >
            <option value="">— Aucun —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.titre} ({formatDate(ev.date)})
              </option>
            ))}
          </select>
        </Field>
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

// ============================ Registre spécial =============================

const REGISTRE_TONE: Record<RegistreType, 'gold' | 'blue' | 'amber' | 'neutral'> = {
  statuts: 'gold',
  dirigeants: 'blue',
  siege: 'amber',
  autre: 'neutral',
}

function RegistreSection({ canWrite }: { canWrite: boolean }) {
  const entries = useTable('registre_entries')
  const [editing, setEditing] = useState<Partial<RegistreEntry> | null>(null)

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  const save = (d: Partial<RegistreEntry>) => {
    if (d.id) update('registre_entries', d.id, d)
    else
      insert('registre_entries', {
        date: d.date ?? new Date().toISOString().slice(0, 10),
        type: d.type ?? 'autre',
        objet: d.objet ?? '',
        description: d.description ?? '',
        date_declaration: d.date_declaration ?? null,
        reference: d.reference ?? '',
        document_url: d.document_url ?? null,
      } as Omit<RegistreEntry, 'id' | 'created_at'>)
    setEditing(null)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-prisme-base/60">
          Registre des modifications statutaires et changements de dirigeants (obligation légale).
        </p>
        {canWrite && (
          <button className="btn-primary shrink-0" onClick={() => setEditing({})}>
            <Plus size={16} /> Nouvelle inscription
          </button>
        )}
      </div>

      <Card className="overflow-x-auto">
        {sorted.length === 0 ? (
          <EmptyState message="Aucune inscription au registre." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Objet</th>
                <th>Déclaration préfecture</th>
                <th>Référence</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-prisme-base/80">{formatDate(e.date)}</td>
                  <td>
                    <Badge tone={REGISTRE_TONE[e.type]}>{REGISTRE_TYPE_LABELS[e.type]}</Badge>
                  </td>
                  <td>
                    <div className="text-prisme-base">{e.objet}</div>
                    {e.description && (
                      <div className="text-xs text-prisme-base/50">{e.description}</div>
                    )}
                    {e.document_url && (
                      <a
                        href={e.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-prisme-gold hover:underline"
                      >
                        <ExternalLink size={12} /> Document
                      </a>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-prisme-base/70">
                    {formatDate(e.date_declaration)}
                  </td>
                  <td className="text-xs text-prisme-base/60">{e.reference || '—'}</td>
                  {canWrite && (
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost p-2" onClick={() => setEditing(e)}>
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-ghost p-2 text-red-300"
                          onClick={() => {
                            if (confirm('Supprimer cette inscription ?'))
                              remove('registre_entries', e.id)
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
      </Card>

      {editing && <RegistreForm draft={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function RegistreForm({
  draft,
  onCancel,
  onSave,
}: {
  draft: Partial<RegistreEntry>
  onCancel: () => void
  onSave: (d: Partial<RegistreEntry>) => void
}) {
  const [form, setForm] = useState<Partial<RegistreEntry>>(draft)
  const set = (p: Partial<RegistreEntry>) => setForm((f) => ({ ...f, ...p }))

  return (
    <Modal open onClose={onCancel} title={draft.id ? "Modifier l'inscription" : 'Nouvelle inscription'} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date de la décision">
            <input
              type="date"
              className="input"
              value={form.date ?? ''}
              onChange={(e) => set({ date: e.target.value })}
              required
            />
          </Field>
          <Field label="Type">
            <select
              className="input"
              value={form.type ?? 'autre'}
              onChange={(e) => set({ type: e.target.value as RegistreType })}
            >
              {Object.entries(REGISTRE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Objet">
          <input
            className="input"
            value={form.objet ?? ''}
            onChange={(e) => set({ objet: e.target.value })}
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className="input"
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date de déclaration en préfecture">
            <input
              type="date"
              className="input"
              value={form.date_declaration ?? ''}
              onChange={(e) => set({ date_declaration: e.target.value || null })}
            />
          </Field>
          <Field label="Référence (récépissé, n° JO…)">
            <input
              className="input"
              value={form.reference ?? ''}
              onChange={(e) => set({ reference: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Lien du document (optionnel)">
          <input
            className="input"
            value={form.document_url ?? ''}
            onChange={(e) => set({ document_url: e.target.value || null })}
            placeholder="https://…"
          />
        </Field>
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
